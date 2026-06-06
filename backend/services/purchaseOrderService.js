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

// Helper to check if user has access to a PO
async function checkPoAccess(po, actor) {
  if (actor.role === 'VENDOR') {
    const vendorId = await getVendorByEmail(actor.email);
    if (!vendorId || po.vendor_id !== vendorId) {
      throw createHttpError(403, 'Access denied. You can only access your own purchase orders.');
    }
  }
}

// ── 1. Create Purchase Order (Procurement Officer) ──────────────────────

async function createPurchaseOrder(payload, actor) {
  if (!payload || !payload.quotationId) {
    throw createHttpError(400, 'quotationId is required.');
  }

  const validQuotationId = assertUuid(payload.quotationId, 'quotationId');
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch quotation and verify status is APPROVED
    const quotationResult = await client.query(
      `
        SELECT q.id, q.status, q.price, q.vendor_id, v.company_name AS vendor_name, r.title AS rfq_title
        FROM quotations q
        JOIN vendors v ON v.id = q.vendor_id
        JOIN rfqs r ON r.id = q.rfq_id
        WHERE q.id = $1
        LIMIT 1
        FOR UPDATE OF q;
      `,
      [validQuotationId]
    );

    if (quotationResult.rowCount === 0) {
      throw createHttpError(404, 'Quotation not found.');
    }

    const quotation = quotationResult.rows[0];

    if (quotation.status !== 'APPROVED') {
      throw createHttpError(400, 'Purchase Order can only be generated for APPROVED quotations.');
    }

    // 2. Check if a Purchase Order already exists for this quotation
    const existingPo = await client.query(
      `SELECT id FROM purchase_orders WHERE quotation_id = $1 LIMIT 1;`,
      [validQuotationId]
    );

    if (existingPo.rowCount > 0) {
      throw createHttpError(409, 'A Purchase Order has already been generated for this quotation.');
    }

    // 3. Generate unique PO Number (e.g., PO-2026-0001)
    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;
    const lastPoResult = await client.query(
      `
        SELECT po_number 
        FROM purchase_orders 
        WHERE po_number LIKE $1 
        ORDER BY po_number DESC 
        LIMIT 1
        FOR UPDATE;
      `,
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (lastPoResult.rowCount > 0) {
      const lastPoNumber = lastPoResult.rows[0].po_number;
      const parts = lastPoNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    const poNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // 4. Create the Purchase Order
    const insertResult = await client.query(
      `
        INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, status)
        VALUES ($1, $2, $3, $4, 'CREATED')
        RETURNING id, po_number, quotation_id, vendor_id, total_amount, status, created_at;
      `,
      [poNumber, validQuotationId, quotation.vendor_id, quotation.price]
    );

    const po = insertResult.rows[0];

    // 5. Notify the Vendor User
    const vendorUserResult = await client.query(
      `
        SELECT u.id
        FROM users u
        JOIN vendors v ON v.email = u.email
        WHERE v.id = $1 AND u.is_active = TRUE
        LIMIT 1;
      `,
      [quotation.vendor_id]
    );

    if (vendorUserResult.rowCount > 0) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, 'Purchase Order Generated', $2);
        `,
        [vendorUserResult.rows[0].id, `Purchase Order ${poNumber} has been generated for your approved quotation.`]
      );
    }

    // 6. Log activity
    await logActivity(client, {
      userId: actorId,
      action: 'PURCHASE_ORDER_GENERATED',
      entityType: 'purchase_order',
      entityId: po.id,
      description: `Purchase Order ${poNumber} generated for quotation ${validQuotationId}`,
    });

    await client.query('COMMIT');

    return po;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── 2. Get All Purchase Orders (Search, Filter, Pagination) ─────────────

async function getPurchaseOrders(filters, actor) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const queryParams = [];
  const clauses = [];

  // Enforce Vendor Ownership restriction
  if (actor.role === 'VENDOR') {
    const vendorId = await getVendorByEmail(actor.email);
    if (!vendorId) {
      return { total: 0, page, limit, purchase_orders: [] };
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
    clauses.push(`po.status = $${queryParams.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM purchase_orders po ${whereClause};`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get records
  queryParams.push(limit, offset);
  const recordsResult = await pool.query(
    `
      SELECT 
        po.id,
        po.po_number,
        po.quotation_id,
        po.vendor_id,
        po.total_amount,
        po.status,
        po.created_at,
        v.company_name AS vendor_name,
        q.price AS quotation_price,
        q.delivery_days AS quotation_delivery_days,
        r.id AS rfq_id,
        r.title AS rfq_title
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      JOIN quotations q ON q.id = po.quotation_id
      JOIN rfqs r ON r.id = q.rfq_id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `,
    queryParams
  );

  return {
    total,
    page,
    limit,
    purchase_orders: recordsResult.rows.map(row => ({
      id: row.id,
      po_number: row.po_number,
      total_amount: Number(row.total_amount),
      status: row.status,
      created_at: row.created_at,
      vendor: {
        id: row.vendor_id,
        company_name: row.vendor_name,
      },
      quotation: {
        id: row.quotation_id,
        price: Number(row.quotation_price),
        delivery_days: row.quotation_delivery_days,
      },
      rfq: {
        id: row.rfq_id,
        title: row.rfq_title,
      }
    })),
  };
}

// ── 3. Get Purchase Order By ID ─────────────────────────────────────────

async function getPurchaseOrderById(poId, actor) {
  const validPoId = assertUuid(poId, 'poId');

  const result = await pool.query(
    `
      SELECT 
        po.id,
        po.po_number,
        po.quotation_id,
        po.vendor_id,
        po.total_amount,
        po.status,
        po.created_at,
        v.company_name AS vendor_name,
        q.price AS quotation_price,
        q.delivery_days AS quotation_delivery_days,
        r.id AS rfq_id,
        r.title AS rfq_title
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      JOIN quotations q ON q.id = po.quotation_id
      JOIN rfqs r ON r.id = q.rfq_id
      WHERE po.id = $1
      LIMIT 1;
    `,
    [validPoId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Purchase Order not found.');
  }

  const row = result.rows[0];

  // Enforce access check
  await checkPoAccess(row, actor);

  // Log activity: Purchase Order Viewed
  await logActivity(pool, {
    userId: actor.id,
    action: 'PURCHASE_ORDER_VIEWED',
    entityType: 'purchase_order',
    entityId: validPoId,
    description: `Purchase Order ${row.po_number} viewed by ${actor.email}`,
  });

  return {
    id: row.id,
    po_number: row.po_number,
    total_amount: Number(row.total_amount),
    status: row.status,
    created_at: row.created_at,
    vendor: {
      id: row.vendor_id,
      company_name: row.vendor_name,
    },
    quotation: {
      id: row.quotation_id,
      price: Number(row.quotation_price),
      delivery_days: row.quotation_delivery_days,
    },
    rfq: {
      id: row.rfq_id,
      title: row.rfq_title,
    }
  };
}

// ── 4. Update Purchase Order Status (Manager, Procurement, Vendor) ──────

async function updatePurchaseOrderStatus(poId, payload, actor) {
  const validPoId = assertUuid(poId, 'poId');
  if (!payload || !payload.status) {
    throw createHttpError(400, 'status is required.');
  }

  const status = String(payload.status).toUpperCase();
  const allowedStatuses = ['CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
  if (!allowedStatuses.includes(status)) {
    throw createHttpError(400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch PO and lock it
    const poResult = await client.query(
      `SELECT id, po_number, status, vendor_id FROM purchase_orders WHERE id = $1 LIMIT 1 FOR UPDATE;`,
      [validPoId]
    );

    if (poResult.rowCount === 0) {
      throw createHttpError(404, 'Purchase Order not found.');
    }

    const po = poResult.rows[0];

    // Enforce role actions
    if (actor.role === 'VENDOR') {
      const vendorId = await getVendorByEmail(actor.email);
      if (!vendorId || po.vendor_id !== vendorId) {
        throw createHttpError(403, 'Access denied. You can only update your own purchase orders.');
      }
      // Vendor can only set to ACCEPTED or REJECTED
      if (status !== 'ACCEPTED' && status !== 'REJECTED') {
        throw createHttpError(403, 'Vendors can only update status to ACCEPTED or REJECTED.');
      }
    } else {
      // Officers/Managers can change state, but let's restrict COMPLETED to PROCUREMENT_OFFICER/ADMIN/MANAGER
      if (status === 'ACCEPTED' || status === 'REJECTED') {
        throw createHttpError(403, 'Only the assigned Vendor can accept or reject the Purchase Order.');
      }
    }

    // Prevent transitions from terminal states
    if (po.status === 'COMPLETED' || po.status === 'REJECTED') {
      throw createHttpError(409, `Cannot change status: Purchase Order is already ${po.status}.`);
    }

    // 2. Update status
    await client.query(
      `UPDATE purchase_orders SET status = $2 WHERE id = $1;`,
      [validPoId, status]
    );

    // 3. Log activity: Purchase Order Status Updated
    await logActivity(client, {
      userId: actor.id,
      action: 'PURCHASE_ORDER_STATUS_UPDATED',
      entityType: 'purchase_order',
      entityId: validPoId,
      description: `Purchase Order ${po.po_number} status updated to ${status} by ${actor.email}`,
    });

    await client.query('COMMIT');

    return {
      id: validPoId,
      po_number: po.po_number,
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
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
};
