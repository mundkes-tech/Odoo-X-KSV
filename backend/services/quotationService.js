const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const ALLOWED_QUOTATION_STATUSES = ['DRAFT', 'SUBMITTED', 'WITHDRAWN'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertUuid(value, fieldName) {
  const normalized = normalizeOptionalText(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return normalized;
}

function sanitizeQuotationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    rfq_id: row.rfq_id,
    vendor_id: row.vendor_id,
    price: Number(row.price),
    delivery_days: Number(row.delivery_days),
    comments: row.comments,
    status: row.status,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
  };
}

function validateQuotationInput(input, isUpdate = false) {
  const payload = input || {};
  const errors = [];
  const sanitized = {};

  if (payload.rfq_id !== undefined) {
    sanitized.rfq_id = assertUuid(payload.rfq_id, 'rfq_id');
  } else if (!isUpdate) {
    errors.push('rfq_id is required.');
  }

  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push('price must be greater than 0.');
    } else {
      sanitized.price = price;
    }
  } else if (!isUpdate) {
    errors.push('price is required.');
  }

  if (payload.delivery_days !== undefined) {
    const deliveryDays = Number(payload.delivery_days);
    if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) {
      errors.push('delivery_days must be greater than 0.');
    } else {
      sanitized.delivery_days = deliveryDays;
    }
  } else if (!isUpdate) {
    errors.push('delivery_days is required.');
  }

  if (payload.comments !== undefined) {
    sanitized.comments = normalizeOptionalText(payload.comments);
  }

  if (payload.status !== undefined) {
    const status = normalizeOptionalText(payload.status);
    const normalizedStatus = status ? status.toUpperCase() : null;
    if (!normalizedStatus || !ALLOWED_QUOTATION_STATUSES.includes(normalizedStatus)) {
      errors.push(`status must be one of: ${ALLOWED_QUOTATION_STATUSES.join(', ')}.`);
    } else {
      sanitized.status = normalizedStatus;
    }
  } else if (!isUpdate) {
    sanitized.status = 'SUBMITTED';
  }

  if (errors.length > 0) {
    throw createHttpError(400, errors.join(' '));
  }

  if (isUpdate && Object.keys(sanitized).length === 0) {
    throw createHttpError(400, 'At least one quotation field must be provided for update.');
  }

  return sanitized;
}

function parsePagination(query) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitCandidate = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;
  const limit = Math.min(limitCandidate, MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

async function resolveActiveVendorForActor(client, actor) {
  if (!actor || String(actor.role).toUpperCase() !== 'VENDOR') {
    throw createHttpError(403, 'Only vendors can perform this quotation action.');
  }

  const result = await client.query(
    `
      SELECT id, company_name, email, status
      FROM vendors
      WHERE email = $1
        AND status = 'ACTIVE'
      LIMIT 1;
    `,
    [actor.email]
  );

  if (result.rowCount === 0) {
    throw createHttpError(403, 'Active vendor profile not found for this user.');
  }

  return result.rows[0];
}

function assertRfqOpen(rfq) {
  if (!rfq) {
    throw createHttpError(404, 'RFQ not found.');
  }

  if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') {
    throw createHttpError(409, 'RFQ is closed and cannot accept quotation changes.');
  }

  if (new Date(rfq.deadline).getTime() <= Date.now()) {
    throw createHttpError(409, 'RFQ deadline has passed.');
  }
}

async function ensureVendorAssignedToRfq(client, rfqId, vendorId) {
  const result = await client.query(
    `
      SELECT rv.id, r.status, r.deadline
      FROM rfqs r
      LEFT JOIN rfq_vendors rv
        ON rv.rfq_id = r.id
        AND rv.vendor_id = $2
      WHERE r.id = $1
      LIMIT 1;
    `,
    [rfqId, vendorId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'RFQ not found.');
  }

  if (!result.rows[0].id) {
    throw createHttpError(403, 'Vendor is not assigned to this RFQ.');
  }

  assertRfqOpen(result.rows[0]);
}

async function logActivity(client, { userId, action, entityId, description }) {
  await client.query(
    `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
      VALUES ($1, $2, 'quotation', $3, $4);
    `,
    [userId, action, entityId, description]
  );
}

async function notifyQuotationSubmitted(client, quotation) {
  const recipientsResult = await client.query(
    `
      SELECT id
      FROM users
      WHERE role IN ('ADMIN', 'PROCUREMENT_OFFICER')
        AND is_active = TRUE;
    `
  );

  for (const recipient of recipientsResult.rows) {
    await client.query(
      `
        INSERT INTO notifications (user_id, title, message)
        VALUES ($1, $2, $3);
      `,
      [recipient.id, 'New Quotation Submitted', 'New quotation submitted for RFQ']
    );
  }
}

async function createQuotation(payload, actor) {
  const quotationInput = validateQuotationInput(payload, false);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const vendor = await resolveActiveVendorForActor(client, actor);
    await ensureVendorAssignedToRfq(client, quotationInput.rfq_id, vendor.id);

    const duplicateResult = await client.query(
      `
        SELECT id
        FROM quotations
        WHERE rfq_id = $1
          AND vendor_id = $2
        LIMIT 1;
      `,
      [quotationInput.rfq_id, vendor.id]
    );

    if (duplicateResult.rowCount > 0) {
      throw createHttpError(409, 'Vendor has already submitted a quotation for this RFQ.');
    }

    const result = await client.query(
      `
        INSERT INTO quotations (rfq_id, vendor_id, price, delivery_days, comments, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, rfq_id, vendor_id, price, delivery_days, comments, status, submitted_at, updated_at;
      `,
      [
        quotationInput.rfq_id,
        vendor.id,
        quotationInput.price,
        quotationInput.delivery_days,
        quotationInput.comments,
        quotationInput.status,
      ]
    );

    const quotation = result.rows[0];

    if (quotation.status === 'SUBMITTED') {
      await notifyQuotationSubmitted(client, quotation);
    }

    await logActivity(client, {
      userId: actorId,
      action: quotation.status === 'WITHDRAWN' ? 'QUOTATION_WITHDRAWN' : 'QUOTATION_CREATED',
      entityId: quotation.id,
      description: `Quotation created for RFQ ${quotation.rfq_id}`,
    });

    await client.query('COMMIT');
    return sanitizeQuotationRow(quotation);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function buildQuotationWhereClause(query, actor) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  const actorRole = actor && actor.role ? String(actor.role).toUpperCase() : null;

  if (actorRole === 'VENDOR') {
    values.push(actor.email);
    conditions.push(`v.email = $${paramIndex}`);
    conditions.push("v.status = 'ACTIVE'");
    paramIndex += 1;
  }

  if (query.status) {
    const status = String(query.status).trim().toUpperCase();
    if (!ALLOWED_QUOTATION_STATUSES.includes(status)) {
      throw createHttpError(400, `status must be one of: ${ALLOWED_QUOTATION_STATUSES.join(', ')}.`);
    }

    values.push(status);
    conditions.push(`q.status = $${paramIndex}`);
    paramIndex += 1;
  }

  if (query.rfqId) {
    values.push(assertUuid(query.rfqId, 'rfqId'));
    conditions.push(`q.rfq_id = $${paramIndex}`);
    paramIndex += 1;
  }

  if (query.vendorId) {
    const vendorId = assertUuid(query.vendorId, 'vendorId');

    if (actorRole === 'VENDOR') {
      const vendorResult = await pool.query(
        `
          SELECT id
          FROM vendors
          WHERE id = $1
            AND email = $2
            AND status = 'ACTIVE'
          LIMIT 1;
        `,
        [vendorId, actor.email]
      );

      if (vendorResult.rowCount === 0) {
        throw createHttpError(403, 'Vendors can only filter their own quotations.');
      }
    }

    values.push(vendorId);
    conditions.push(`q.vendor_id = $${paramIndex}`);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

async function listQuotations(query, actor) {
  const { page, limit, offset } = parsePagination(query || {});
  const { whereClause, values } = await buildQuotationWhereClause(query || {}, actor);

  const fromClause = `
    FROM quotations q
    JOIN vendors v ON v.id = q.vendor_id
  `;

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total ${fromClause} ${whereClause};`, values);
  const dataResult = await pool.query(
    `
      SELECT q.id, q.rfq_id, q.vendor_id, q.price, q.delivery_days, q.comments, q.status, q.submitted_at, q.updated_at
      ${fromClause}
      ${whereClause}
      ORDER BY q.submitted_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `,
    [...values, limit, offset]
  );

  const total = countResult.rows[0].total;

  return {
    quotations: dataResult.rows.map(sanitizeQuotationRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getQuotationById(quotationId, actor) {
  const id = assertUuid(quotationId, 'id');
  const actorRole = actor && actor.role ? String(actor.role).toUpperCase() : null;
  const values = [id];
  let vendorCondition = '';

  if (actorRole === 'VENDOR') {
    values.push(actor.email);
    vendorCondition = "AND v.email = $2 AND v.status = 'ACTIVE'";
  }

  const result = await pool.query(
    `
      SELECT q.id, q.rfq_id, q.vendor_id, q.price, q.delivery_days, q.comments, q.status, q.submitted_at, q.updated_at
      FROM quotations q
      JOIN vendors v ON v.id = q.vendor_id
      WHERE q.id = $1
      ${vendorCondition}
      LIMIT 1;
    `,
    values
  );

  if (result.rowCount === 0) {
    throw createHttpError(actorRole === 'VENDOR' ? 403 : 404, 'Quotation not found or access denied.');
  }

  return sanitizeQuotationRow(result.rows[0]);
}

async function updateQuotation(quotationId, payload, actor) {
  const id = assertUuid(quotationId, 'id');
  const quotationInput = validateQuotationInput(payload, true);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const vendor = await resolveActiveVendorForActor(client, actor);
    const existingResult = await client.query(
      `
        SELECT q.id, q.rfq_id, q.vendor_id, q.price, q.delivery_days, q.comments, q.status, q.submitted_at, q.updated_at,
          r.status AS rfq_status,
          r.deadline AS rfq_deadline
        FROM quotations q
        JOIN rfqs r ON r.id = q.rfq_id
        WHERE q.id = $1
        LIMIT 1
        FOR UPDATE OF q;
      `,
      [id]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError(404, 'Quotation not found.');
    }

    const existing = existingResult.rows[0];
    if (existing.vendor_id !== vendor.id) {
      throw createHttpError(403, 'Vendors can only update their own quotations.');
    }

    assertRfqOpen({
      status: existing.rfq_status,
      deadline: existing.rfq_deadline,
    });

    const result = await client.query(
      `
        UPDATE quotations
        SET
          price = COALESCE($2, price),
          delivery_days = COALESCE($3, delivery_days),
          comments = COALESCE($4, comments),
          status = COALESCE($5, status)
        WHERE id = $1
        RETURNING id, rfq_id, vendor_id, price, delivery_days, comments, status, submitted_at, updated_at;
      `,
      [
        id,
        quotationInput.price ?? null,
        quotationInput.delivery_days ?? null,
        quotationInput.comments === undefined ? null : quotationInput.comments,
        quotationInput.status ?? null,
      ]
    );

    const quotation = result.rows[0];
    const action = quotation.status === 'WITHDRAWN' ? 'QUOTATION_WITHDRAWN' : 'QUOTATION_UPDATED';

    if (existing.status !== 'SUBMITTED' && quotation.status === 'SUBMITTED') {
      await notifyQuotationSubmitted(client, quotation);
    }

    await logActivity(client, {
      userId: actorId,
      action,
      entityId: quotation.id,
      description: `${action === 'QUOTATION_WITHDRAWN' ? 'Quotation withdrawn' : 'Quotation updated'} for RFQ ${quotation.rfq_id}`,
    });

    await client.query('COMMIT');
    return sanitizeQuotationRow(quotation);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ALLOWED_QUOTATION_STATUSES,
  createQuotation,
  listQuotations,
  getQuotationById,
  updateQuotation,
};
