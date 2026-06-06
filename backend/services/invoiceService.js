const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value, fieldName) {
  if (!value || !UUID_REGEX.test(String(value).trim())) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return String(value).trim();
}

async function logActivity(client, { userId, action, entityType, entityId, description }) {
  await client.query(
    `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
      VALUES ($1, $2, $3, $4, $5);
    `,
    [userId, action, entityType, entityId, description]
  );
}

// Helper to get vendor ID from user email
async function getVendorByEmail(email) {
  const result = await pool.query(
    `SELECT id FROM vendors WHERE email = $1 LIMIT 1;`,
    [email]
  );
  return result.rows[0] ? result.rows[0].id : null;
}

// Helper to check if user has access to an Invoice
async function checkInvoiceAccess(invoice, actor) {
  if (actor.role === 'VENDOR') {
    const vendorId = await getVendorByEmail(actor.email);
    if (!vendorId || invoice.vendor_id !== vendorId) {
      throw createHttpError(403, 'Access denied. You can only access your own invoices.');
    }
  }
}

// ── 1. Create Invoice (Procurement Officer) ─────────────────────────────

async function createInvoice(payload, actor) {
  if (!payload || !payload.purchaseOrderId) {
    throw createHttpError(400, 'purchaseOrderId is required.');
  }

  const validPoId = assertUuid(payload.purchaseOrderId, 'purchaseOrderId');
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch Purchase Order and lock it
    const poResult = await client.query(
      `
        SELECT po.id, po.po_number, po.status, po.total_amount, po.vendor_id
        FROM purchase_orders po
        WHERE po.id = $1
        LIMIT 1
        FOR UPDATE OF po;
      `,
      [validPoId]
    );

    if (poResult.rowCount === 0) {
      throw createHttpError(404, 'Purchase Order not found.');
    }

    const po = poResult.rows[0];

    // Verify PO status is valid (not REJECTED)
    if (po.status === 'REJECTED') {
      throw createHttpError(400, 'Invoice cannot be generated for REJECTED Purchase Orders.');
    }

    // 2. Check if an invoice already exists for this PO
    const existingInvoice = await client.query(
      `SELECT id FROM invoices WHERE purchase_order_id = $1 LIMIT 1;`,
      [validPoId]
    );

    if (existingInvoice.rowCount > 0) {
      throw createHttpError(409, 'An invoice has already been generated for this Purchase Order.');
    }

    // 3. Tax Calculations
    const subtotal = Number(po.total_amount);
    const taxAmount = Number((subtotal * 0.18).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // 4. Generate unique Invoice Number (INV-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;
    const lastInvoiceResult = await client.query(
      `
        SELECT invoice_number 
        FROM invoices 
        WHERE invoice_number LIKE $1 
        ORDER BY invoice_number DESC 
        LIMIT 1
        FOR UPDATE;
      `,
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (lastInvoiceResult.rowCount > 0) {
      const lastInv = lastInvoiceResult.rows[0].invoice_number;
      const parts = lastInv.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // 5. Create the Invoice
    const insertResult = await client.query(
      `
        INSERT INTO invoices (invoice_number, purchase_order_id, subtotal, tax_amount, total_amount, status)
        VALUES ($1, $2, $3, $4, $5, 'GENERATED')
        RETURNING id, invoice_number, purchase_order_id, subtotal, tax_amount, total_amount, status, created_at;
      `,
      [invoiceNumber, validPoId, subtotal, taxAmount, totalAmount]
    );

    const invoice = insertResult.rows[0];

    // 6. Notify Vendor User
    const vendorUserResult = await client.query(
      `
        SELECT u.id
        FROM users u
        JOIN vendors v ON v.email = u.email
        WHERE v.id = $1 AND u.is_active = TRUE
        LIMIT 1;
      `,
      [po.vendor_id]
    );

    if (vendorUserResult.rowCount > 0) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, 'Invoice Generated', $2);
        `,
        [vendorUserResult.rows[0].id, `Invoice ${invoiceNumber} has been generated for Purchase Order ${po.po_number}.`]
      );
    }

    // 7. Log activity: Invoice Generated
    await logActivity(client, {
      userId: actorId,
      action: 'INVOICE_GENERATED',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Invoice ${invoiceNumber} generated for Purchase Order ${po.po_number}`,
    });

    await client.query('COMMIT');

    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      purchase_order_id: invoice.purchase_order_id,
      subtotal: Number(invoice.subtotal),
      tax_amount: Number(invoice.tax_amount),
      total_amount: Number(invoice.total_amount),
      status: invoice.status,
      created_at: invoice.created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── 2. Get All Invoices (Search, Filter, Pagination) ────────────────────

async function getInvoices(filters, actor) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const queryParams = [];
  const clauses = [];

  // Enforce Vendor Ownership restriction
  if (actor.role === 'VENDOR') {
    const vendorId = await getVendorByEmail(actor.email);
    if (!vendorId) {
      return { total: 0, page, limit, invoices: [] };
    }
    queryParams.push(vendorId);
    clauses.push(`po.vendor_id = $${queryParams.length}`);
  } else if (filters.vendorId) {
    queryParams.push(assertUuid(filters.vendorId, 'vendorId'));
    clauses.push(`po.vendor_id = $${queryParams.length}`);
  }

  if (filters.status) {
    const upperStatus = String(filters.status).toUpperCase();
    queryParams.push(upperStatus);
    clauses.push(`inv.status = $${queryParams.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  // Get total count
  const countResult = await pool.query(
    `
      SELECT COUNT(*) 
      FROM invoices inv
      JOIN purchase_orders po ON po.id = inv.purchase_order_id
      ${whereClause};
    `,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get records
  queryParams.push(limit, offset);
  const recordsResult = await pool.query(
    `
      SELECT 
        inv.id,
        inv.invoice_number,
        inv.purchase_order_id,
        inv.subtotal,
        inv.tax_amount,
        inv.total_amount,
        inv.status,
        inv.created_at,
        po.po_number,
        po.vendor_id,
        v.company_name AS vendor_name
      FROM invoices inv
      JOIN purchase_orders po ON po.id = inv.purchase_order_id
      JOIN vendors v ON v.id = po.vendor_id
      ${whereClause}
      ORDER BY inv.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `,
    queryParams
  );

  return {
    total,
    page,
    limit,
    invoices: recordsResult.rows.map(row => ({
      id: row.id,
      invoice_number: row.invoice_number,
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.tax_amount),
      total_amount: Number(row.total_amount),
      status: row.status,
      created_at: row.created_at,
      purchase_order: {
        id: row.purchase_order_id,
        po_number: row.po_number,
      },
      vendor: {
        id: row.vendor_id,
        company_name: row.vendor_name,
      }
    })),
  };
}

// ── 3. Get Invoice By ID ────────────────────────────────────────────────

async function getInvoiceById(invoiceId, actor) {
  const validInvoiceId = assertUuid(invoiceId, 'invoiceId');

  const result = await pool.query(
    `
      SELECT 
        inv.id,
        inv.invoice_number,
        inv.purchase_order_id,
        inv.subtotal,
        inv.tax_amount,
        inv.total_amount,
        inv.status,
        inv.created_at,
        po.po_number,
        po.vendor_id,
        v.company_name AS vendor_name
      FROM invoices inv
      JOIN purchase_orders po ON po.id = inv.purchase_order_id
      JOIN vendors v ON v.id = po.vendor_id
      WHERE inv.id = $1
      LIMIT 1;
    `,
    [validInvoiceId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Invoice not found.');
  }

  const row = result.rows[0];

  // Enforce access check
  await checkInvoiceAccess(row, actor);

  // Log activity: Invoice Viewed
  await logActivity(pool, {
    userId: actor.id,
    action: 'INVOICE_VIEWED',
    entityType: 'invoice',
    entityId: validInvoiceId,
    description: `Invoice ${row.invoice_number} viewed by ${actor.email}`,
  });

  return {
    id: row.id,
    invoice_number: row.invoice_number,
    subtotal: Number(row.subtotal),
    tax_amount: Number(row.tax_amount),
    total_amount: Number(row.total_amount),
    status: row.status,
    created_at: row.created_at,
    purchase_order: {
      id: row.purchase_order_id,
      po_number: row.po_number,
    },
    vendor: {
      id: row.vendor_id,
      company_name: row.vendor_name,
    }
  };
}

// ── 4. Update Invoice Status (Admin, Manager, Procurement Officer) ──────

async function updateInvoiceStatus(invoiceId, payload, actor) {
  const validInvoiceId = assertUuid(invoiceId, 'invoiceId');
  if (!payload || !payload.status) {
    throw createHttpError(400, 'status is required.');
  }

  const status = String(payload.status).toUpperCase();
  const allowedStatuses = ['GENERATED', 'SENT', 'PAID', 'CANCELLED'];
  if (!allowedStatuses.includes(status)) {
    throw createHttpError(400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
  }

  // Restrictions: Vendors cannot modify invoice status
  if (actor.role === 'VENDOR') {
    throw createHttpError(403, 'Access denied. Vendors cannot modify invoice status.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch invoice and lock it
    const invoiceResult = await client.query(
      `
        SELECT inv.id, inv.invoice_number, inv.status, po.vendor_id
        FROM invoices inv
        JOIN purchase_orders po ON po.id = inv.purchase_order_id
        WHERE inv.id = $1
        LIMIT 1
        FOR UPDATE OF inv;
      `,
      [validInvoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      throw createHttpError(404, 'Invoice not found.');
    }

    const invoice = invoiceResult.rows[0];

    // Prevent transitions from terminal states (PAID, CANCELLED)
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw createHttpError(409, `Cannot change status: Invoice is already ${invoice.status}.`);
    }

    // 2. Update status
    await client.query(
      `UPDATE invoices SET status = $2 WHERE id = $1;`,
      [validInvoiceId, status]
    );

    // 3. Log activity: Invoice Status Updated
    await logActivity(client, {
      userId: actor.id,
      action: 'INVOICE_STATUS_UPDATED',
      entityType: 'invoice',
      entityId: validInvoiceId,
      description: `Invoice ${invoice.invoice_number} status updated to ${status} by ${actor.email}`,
    });

    await client.query('COMMIT');

    return {
      id: validInvoiceId,
      invoice_number: invoice.invoice_number,
      status,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
};
