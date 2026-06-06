const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_SORT_FIELDS = ['price', 'delivery_days'];
const ALLOWED_ORDER_VALUES = ['asc', 'desc'];

// ── Helpers ────────────────────────────────────────────────────────────────

function assertUuid(value, fieldName) {
  if (!value || !UUID_REGEX.test(String(value).trim())) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return String(value).trim();
}

function parseSortOptions(query) {
  const sortBy = query.sortBy ? String(query.sortBy).trim().toLowerCase() : null;
  const order = query.order ? String(query.order).trim().toLowerCase() : 'asc';

  if (sortBy && !ALLOWED_SORT_FIELDS.includes(sortBy)) {
    throw createHttpError(400, `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}.`);
  }

  if (!ALLOWED_ORDER_VALUES.includes(order)) {
    throw createHttpError(400, `order must be one of: ${ALLOWED_ORDER_VALUES.join(', ')}.`);
  }

  return { sortBy, order };
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

// ── GET /rfqs/:rfqId/comparison ────────────────────────────────────────────

async function getComparison(rfqId, query, actor) {
  const validRfqId = assertUuid(rfqId, 'rfqId');
  const { sortBy, order } = parseSortOptions(query || {});
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    // 1. Fetch RFQ
    const rfqResult = await client.query(
      `
        SELECT id, title, description, quantity, deadline, attachment_url, status, created_by, created_at, updated_at
        FROM rfqs
        WHERE id = $1
        LIMIT 1;
      `,
      [validRfqId]
    );

    if (rfqResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const rfq = rfqResult.rows[0];

    // 2. Fetch quotations with vendor info
    let orderClause = 'ORDER BY q.submitted_at DESC';
    if (sortBy) {
      const column = sortBy === 'price' ? 'q.price' : 'q.delivery_days';
      orderClause = `ORDER BY ${column} ${order.toUpperCase()}`;
    }

    const quotationsResult = await client.query(
      `
        SELECT
          q.id AS quotation_id,
          q.vendor_id,
          v.company_name AS vendor_name,
          q.price,
          q.delivery_days,
          q.comments,
          q.status AS quotation_status
        FROM quotations q
        JOIN vendors v ON v.id = q.vendor_id
        WHERE q.rfq_id = $1
        ${orderClause};
      `,
      [validRfqId]
    );

    const quotations = quotationsResult.rows.map((row) => ({
      quotation_id: row.quotation_id,
      vendor_id: row.vendor_id,
      vendor_name: row.vendor_name,
      price: Number(row.price),
      delivery_days: Number(row.delivery_days),
      comments: row.comments,
      quotation_status: row.quotation_status,
    }));

    // 3. Calculate comparison metrics
    let lowestPrice = null;
    let fastestDelivery = null;

    const submittedQuotations = quotations.filter((q) => q.quotation_status === 'SUBMITTED');

    if (submittedQuotations.length > 0) {
      lowestPrice = Math.min(...submittedQuotations.map((q) => q.price));
      fastestDelivery = Math.min(...submittedQuotations.map((q) => q.delivery_days));
    }

    const enrichedQuotations = quotations.map((q) => ({
      ...q,
      isLowestPrice: q.quotation_status === 'SUBMITTED' && q.price === lowestPrice,
      isFastestDelivery: q.quotation_status === 'SUBMITTED' && q.delivery_days === fastestDelivery,
    }));

    // 4. Determine best vendors
    const lowestPriceVendor = submittedQuotations.length > 0
      ? submittedQuotations.find((q) => q.price === lowestPrice) || null
      : null;

    const fastestDeliveryVendor = submittedQuotations.length > 0
      ? submittedQuotations.find((q) => q.delivery_days === fastestDelivery) || null
      : null;

    // 5. Log activity (comparison viewed)
    await logActivity(client, {
      userId: actorId,
      action: 'COMPARISON_VIEWED',
      entityType: 'rfq',
      entityId: validRfqId,
      description: `Quotation comparison viewed for RFQ: ${rfq.title}`,
    });

    return {
      rfq: {
        id: rfq.id,
        title: rfq.title,
        description: rfq.description,
        quantity: Number(rfq.quantity),
        deadline: rfq.deadline,
        attachment_url: rfq.attachment_url,
        status: rfq.status,
        created_by: rfq.created_by,
        created_at: rfq.created_at,
        updated_at: rfq.updated_at,
      },
      metrics: {
        total_quotations: quotations.length,
        submitted_quotations: submittedQuotations.length,
        lowest_price: lowestPrice,
        fastest_delivery: fastestDelivery,
        lowest_price_vendor: lowestPriceVendor
          ? { vendor_id: lowestPriceVendor.vendor_id, vendor_name: lowestPriceVendor.vendor_name, price: lowestPriceVendor.price }
          : null,
        fastest_delivery_vendor: fastestDeliveryVendor
          ? { vendor_id: fastestDeliveryVendor.vendor_id, vendor_name: fastestDeliveryVendor.vendor_name, delivery_days: fastestDeliveryVendor.delivery_days }
          : null,
      },
      quotations: enrichedQuotations,
    };
  } finally {
    client.release();
  }
}

// ── POST /rfqs/:rfqId/select-vendor ────────────────────────────────────────

async function selectVendor(rfqId, payload, actor) {
  const validRfqId = assertUuid(rfqId, 'rfqId');
  const actorId = actor && actor.id ? actor.id : null;

  if (!payload || !payload.quotationId) {
    throw createHttpError(400, 'quotationId is required.');
  }

  const validQuotationId = assertUuid(payload.quotationId, 'quotationId');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify RFQ exists and lock it
    const rfqResult = await client.query(
      `
        SELECT id, title, status
        FROM rfqs
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [validRfqId]
    );

    if (rfqResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const rfq = rfqResult.rows[0];

    // Prevent duplicate selection
    if (rfq.status === 'VENDOR_SELECTED') {
      throw createHttpError(409, 'A vendor has already been selected for this RFQ.');
    }

    // RFQ must be in a state that allows vendor selection
    if (rfq.status === 'CANCELLED') {
      throw createHttpError(409, 'Cannot select vendor for a cancelled RFQ.');
    }

    if (rfq.status === 'DRAFT') {
      throw createHttpError(409, 'Cannot select vendor for an RFQ in DRAFT status.');
    }

    // 2. Verify quotation exists and belongs to this RFQ
    const quotationResult = await client.query(
      `
        SELECT q.id, q.rfq_id, q.vendor_id, q.price, q.delivery_days, q.status,
               v.company_name AS vendor_name
        FROM quotations q
        JOIN vendors v ON v.id = q.vendor_id
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

    if (quotation.rfq_id !== validRfqId) {
      throw createHttpError(400, 'Quotation does not belong to this RFQ.');
    }

    if (quotation.status !== 'SUBMITTED') {
      throw createHttpError(409, 'Only quotations with SUBMITTED status can be selected.');
    }

    // 3. Update selected quotation status to SELECTED
    await client.query(
      `UPDATE quotations SET status = 'SELECTED' WHERE id = $1;`,
      [validQuotationId]
    );

    // 4. Update other quotations for this RFQ to REJECTED
    await client.query(
      `UPDATE quotations SET status = 'REJECTED' WHERE rfq_id = $1 AND id <> $2 AND status = 'SUBMITTED';`,
      [validRfqId, validQuotationId]
    );

    // 5. Update RFQ status to VENDOR_SELECTED
    await client.query(
      `UPDATE rfqs SET status = 'VENDOR_SELECTED' WHERE id = $1;`,
      [validRfqId]
    );

    // 6. Notify selected vendor
    const selectedVendorUserResult = await client.query(
      `
        SELECT u.id
        FROM users u
        JOIN vendors v ON v.email = u.email
        WHERE v.id = $1
          AND u.role = 'VENDOR'
          AND u.is_active = TRUE;
      `,
      [quotation.vendor_id]
    );

    for (const user of selectedVendorUserResult.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3);`,
        [user.id, 'Quotation Selected', 'Your quotation has been selected.']
      );
    }

    // 7. Notify other vendors
    const otherVendorsResult = await client.query(
      `
        SELECT DISTINCT u.id
        FROM users u
        JOIN vendors v ON v.email = u.email
        JOIN quotations q ON q.vendor_id = v.id
        WHERE q.rfq_id = $1
          AND q.vendor_id <> $2
          AND u.role = 'VENDOR'
          AND u.is_active = TRUE;
      `,
      [validRfqId, quotation.vendor_id]
    );

    for (const user of otherVendorsResult.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3);`,
        [user.id, 'RFQ Vendor Selected', 'RFQ has been awarded to another vendor.']
      );
    }

    // 8. Log activity
    await logActivity(client, {
      userId: actorId,
      action: 'VENDOR_SELECTED',
      entityType: 'rfq',
      entityId: validRfqId,
      description: `Vendor selected for RFQ "${rfq.title}": ${quotation.vendor_name} (Quotation: ${validQuotationId})`,
    });

    await client.query('COMMIT');

    return {
      rfq_id: validRfqId,
      rfq_title: rfq.title,
      rfq_status: 'VENDOR_SELECTED',
      selected_quotation: {
        quotation_id: quotation.id,
        vendor_id: quotation.vendor_id,
        vendor_name: quotation.vendor_name,
        price: Number(quotation.price),
        delivery_days: Number(quotation.delivery_days),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getComparison,
  selectVendor,
};
