const { pool } = require('../config/db');
const { createUserAccount, DEFAULT_VENDOR_TEMP_PASSWORD } = require('./authService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_COMPANY_NAME_LENGTH = 3;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeVendorRow(vendorRow) {
  if (!vendorRow) {
    return null;
  }

  return {
    id: vendorRow.id,
    company_name: vendorRow.company_name,
    gst_number: vendorRow.gst_number,
    category: vendorRow.category,
    email: vendorRow.email,
    phone: vendorRow.phone,
    address: vendorRow.address,
    status: vendorRow.status,
    created_at: vendorRow.created_at,
    updated_at: vendorRow.updated_at,
    rfqs_participated: vendorRow.rfqs_participated,
    quotations_submitted: vendorRow.quotations_submitted,
    success_rate: vendorRow.success_rate,
    rating: vendorRow.rating,
    delivery_performance: vendorRow.delivery_performance,
    procurement_value: vendorRow.procurement_value,
  };
}

function validateVendorInput(input, isUpdate = false) {
  const payload = input || {};
  const errors = [];
  const sanitized = {};

  if (payload.company_name !== undefined) {
    const companyName = normalizeOptionalText(payload.company_name);
    if (!companyName || companyName.length < MIN_COMPANY_NAME_LENGTH) {
      errors.push(`company_name must be at least ${MIN_COMPANY_NAME_LENGTH} characters.`);
    } else {
      sanitized.company_name = companyName;
    }
  } else if (!isUpdate) {
    errors.push('company_name is required.');
  }

  if (payload.gst_number !== undefined) {
    const gstNumber = normalizeOptionalText(payload.gst_number);
    if (!gstNumber) {
      errors.push('gst_number is required.');
    } else {
      sanitized.gst_number = gstNumber;
    }
  } else if (!isUpdate) {
    errors.push('gst_number is required.');
  }

  if (payload.category !== undefined) {
    const category = normalizeOptionalText(payload.category);
    if (!category) {
      errors.push('category is required.');
    } else {
      sanitized.category = category;
    }
  } else if (!isUpdate) {
    errors.push('category is required.');
  }

  if (payload.email !== undefined) {
    const email = normalizeOptionalText(payload.email);
    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push('email must be a valid email address.');
    } else {
      sanitized.email = email.toLowerCase();
    }
  } else if (!isUpdate) {
    errors.push('email is required.');
  }

  if (payload.phone !== undefined) {
    const phone = normalizeOptionalText(payload.phone);
    if (!phone) {
      errors.push('phone is required.');
    } else {
      sanitized.phone = phone;
    }
  } else if (!isUpdate) {
    errors.push('phone is required.');
  }

  if (payload.address !== undefined) {
    sanitized.address = normalizeOptionalText(payload.address);
  }

  if (payload.status !== undefined) {
    const status = normalizeOptionalText(payload.status);
    const normalizedStatus = status ? status.toUpperCase() : null;
    if (!normalizedStatus || !ALLOWED_STATUSES.includes(normalizedStatus)) {
      errors.push(`status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    } else {
      sanitized.status = normalizedStatus;
    }
  } else if (!isUpdate) {
    sanitized.status = 'ACTIVE';
  }

  if (errors.length > 0) {
    throw createHttpError(400, errors.join(' '));
  }

  if (isUpdate && Object.keys(sanitized).length === 0) {
    throw createHttpError(400, 'At least one vendor field must be provided for update.');
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

function buildVendorWhereClause({ search, status, category }) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(
      company_name ILIKE $${paramIndex}
      OR gst_number ILIKE $${paramIndex}
      OR email ILIKE $${paramIndex}
      OR phone ILIKE $${paramIndex}
      OR category ILIKE $${paramIndex}
      OR COALESCE(address, '') ILIKE $${paramIndex}
    )`);
    paramIndex += 1;
  }

  if (status) {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      throw createHttpError(400, `status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }

    values.push(normalizedStatus);
    conditions.push(`status = $${paramIndex}`);
    paramIndex += 1;
  }

  if (category) {
    values.push(String(category).trim());
    conditions.push(`category ILIKE $${paramIndex}`);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

async function ensureVendorUniqueness({ client, email, gst_number, excludeVendorId = null }) {
  const conditions = ['(email = $1 OR gst_number = $2)'];
  const values = [email, gst_number];

  if (excludeVendorId) {
    values.push(excludeVendorId);
    conditions.push(`id <> $3`);
  }

  const queryText = `
    SELECT id, email, gst_number
    FROM vendors
    WHERE ${conditions.join(' AND ')}
    LIMIT 1;
  `;

  const result = await client.query(queryText, values);
  if (result.rowCount > 0) {
    const row = result.rows[0];
    if (row.email === email) {
      throw createHttpError(409, 'A vendor with this email already exists.');
    }
    if (row.gst_number === gst_number) {
      throw createHttpError(409, 'A vendor with this GST number already exists.');
    }
  }
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

async function createVendor(payload, actor) {
  const vendorInput = validateVendorInput(payload, false);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureVendorUniqueness({ client, email: vendorInput.email, gst_number: vendorInput.gst_number });

    const existingUserResult = await client.query(
      `
        SELECT id, role, vendor_id
        FROM users
        WHERE email = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [vendorInput.email]
    );

    if (existingUserResult.rowCount > 0) {
      const existingUser = existingUserResult.rows[0];

      if (existingUser.role !== 'VENDOR') {
        throw createHttpError(409, 'A user with this email already exists.');
      }

      if (existingUser.vendor_id) {
        throw createHttpError(409, 'Vendor account already exists for this email.');
      }
    }

    const insertResult = await client.query(
      `
        INSERT INTO vendors (company_name, gst_number, category, email, phone, address, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, company_name, gst_number, category, email, phone, address, status, created_at, updated_at;
      `,
      [
        vendorInput.company_name,
        vendorInput.gst_number,
        vendorInput.category,
        vendorInput.email,
        vendorInput.phone,
        vendorInput.address,
        vendorInput.status,
      ]
    );

    const createdVendor = insertResult.rows[0];
    const temporaryPassword = DEFAULT_VENDOR_TEMP_PASSWORD;

    if (existingUserResult.rowCount > 0) {
      const passwordHash = await require('bcrypt').hash(temporaryPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
      const linkedUserResult = await client.query(
        `
          UPDATE users
          SET
            full_name = $2,
            password_hash = $3,
            vendor_id = $4,
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, full_name, email, role, vendor_id, is_active, created_at, updated_at;
        `,
        [existingUserResult.rows[0].id, createdVendor.company_name, passwordHash, createdVendor.id]
      );
    } else {
      await createUserAccount(
        {
          full_name: createdVendor.company_name,
          email: createdVendor.email,
          password: temporaryPassword,
          role: 'VENDOR',
        },
        {
          client,
          allowedRoles: ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
          vendorId: createdVendor.id,
          isActive: true,
        }
      );
    }

    await logActivity(client, {
      userId: actorId,
      action: 'VENDOR_CREATED',
      entityType: 'vendor',
      entityId: createdVendor.id,
      description: `Vendor created: ${createdVendor.company_name}`,
    });

    await client.query('COMMIT');

    const { sendVendorCredentialsEmail } = require('./emailService');
    await sendVendorCredentialsEmail({
      email: createdVendor.email,
      companyName: createdVendor.company_name,
      temporaryPassword,
    });

    return sanitizeVendorRow(createdVendor);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listVendors(query) {
  const { page, limit, offset } = parsePagination(query || {});
  const { whereClause, values } = buildVendorWhereClause(query || {});

  const countQuery = `SELECT COUNT(*)::int AS total FROM vendors ${whereClause};`;
  const dataQuery = `
    SELECT
      v.id,
      v.company_name,
      v.gst_number,
      v.category,
      v.email,
      v.phone,
      v.address,
      v.status,
      v.created_at,
      v.updated_at,
      COALESCE(rfq_metrics.rfqs_participated, 0)::int AS rfqs_participated,
      COALESCE(quotation_metrics.quotations_submitted, 0)::int AS quotations_submitted,
      COALESCE(
        ROUND(
          CASE
            WHEN COALESCE(quotation_metrics.quotations_submitted, 0) > 0 THEN
              (quotation_metrics.selected_quotations::numeric / quotation_metrics.quotations_submitted) * 100
            ELSE NULL
          END,
          1
        ),
        0
      )::numeric AS success_rate,
      COALESCE(
        ROUND(
          (
            COALESCE(
              CASE
                WHEN COALESCE(quotation_metrics.quotations_submitted, 0) > 0 THEN
                  (quotation_metrics.selected_quotations::numeric / quotation_metrics.quotations_submitted) * 100
                ELSE 0
              END,
              0
            ) +
            COALESCE(
              CASE
                WHEN COALESCE(po_metrics.purchase_orders_count, 0) > 0 THEN
                  (po_metrics.completed_purchase_orders::numeric / po_metrics.purchase_orders_count) * 100
                ELSE 0
              END,
              0
            )
          ) / 40.0,
          1
        ),
        0
      )::numeric AS rating,
      COALESCE(
        ROUND(
          CASE
            WHEN COALESCE(po_metrics.purchase_orders_count, 0) > 0 THEN
              (po_metrics.completed_purchase_orders::numeric / po_metrics.purchase_orders_count) * 100
            ELSE NULL
          END,
          1
        ),
        0
      )::numeric AS delivery_performance,
      COALESCE(po_metrics.procurement_value, 0)::numeric AS procurement_value
    FROM vendors v
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT rv.rfq_id)::int AS rfqs_participated
      FROM rfq_vendors rv
      WHERE rv.vendor_id = v.id
    ) rfq_metrics ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS quotations_submitted,
        COUNT(*) FILTER (WHERE q.status = 'SELECTED')::int AS selected_quotations
      FROM quotations q
      WHERE q.vendor_id = v.id
    ) quotation_metrics ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS purchase_orders_count,
        COUNT(*) FILTER (WHERE po.status = 'COMPLETED')::int AS completed_purchase_orders,
        COALESCE(SUM(po.total_amount), 0)::numeric AS procurement_value
      FROM purchase_orders po
      WHERE po.vendor_id = v.id
    ) po_metrics ON TRUE
    ${whereClause}
    ORDER BY v.created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countResult = await pool.query(countQuery, values);
  const dataResult = await pool.query(dataQuery, [...values, limit, offset]);

  const total = countResult.rows[0].total;

  return {
    vendors: dataResult.rows.map((row) => ({
      ...sanitizeVendorRow(row),
      rfqs_participated: Number(row.rfqs_participated || 0),
      quotations_submitted: Number(row.quotations_submitted || 0),
      success_rate: row.success_rate === null ? null : Number(row.success_rate),
      rating: row.rating === null ? null : Number(row.rating),
      delivery_performance: row.delivery_performance === null ? null : Number(row.delivery_performance),
      procurement_value: Number(row.procurement_value || 0),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getVendorById(vendorId) {
  const result = await pool.query(
    `
      SELECT id, company_name, gst_number, category, email, phone, address, status, created_at, updated_at
      FROM vendors
      WHERE id = $1
      LIMIT 1;
    `,
    [vendorId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Vendor not found.');
  }

  return sanitizeVendorRow(result.rows[0]);
}

async function updateVendor(vendorId, payload, actor) {
  const vendorInput = validateVendorInput(payload, true);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `
        SELECT id, company_name, gst_number, category, email, phone, address, status, created_at, updated_at
        FROM vendors
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [vendorId]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError(404, 'Vendor not found.');
    }

    const existingVendor = existingResult.rows[0];
    const nextEmail = vendorInput.email ?? existingVendor.email;
    const nextGstNumber = vendorInput.gst_number ?? existingVendor.gst_number;

    await ensureVendorUniqueness({
      client,
      email: nextEmail,
      gst_number: nextGstNumber,
      excludeVendorId: vendorId,
    });

    const updatedVendorResult = await client.query(
      `
        UPDATE vendors
        SET
          company_name = COALESCE($2, company_name),
          gst_number = COALESCE($3, gst_number),
          category = COALESCE($4, category),
          email = COALESCE($5, email),
          phone = COALESCE($6, phone),
          address = COALESCE($7, address),
          status = COALESCE($8, status)
        WHERE id = $1
        RETURNING id, company_name, gst_number, category, email, phone, address, status, created_at, updated_at;
      `,
      [
        vendorId,
        vendorInput.company_name ?? null,
        vendorInput.gst_number ?? null,
        vendorInput.category ?? null,
        vendorInput.email ?? null,
        vendorInput.phone ?? null,
        vendorInput.address === undefined ? null : vendorInput.address,
        vendorInput.status ?? null,
      ]
    );

    const updatedVendor = updatedVendorResult.rows[0];

    const linkedUserResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE vendor_id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [vendorId]
    );

    if (linkedUserResult.rowCount > 0) {
      await client.query(
        `
          UPDATE users
          SET
            full_name = $2,
            email = $3,
            is_active = $4,
            updated_at = NOW()
          WHERE vendor_id = $1;
        `,
        [vendorId, updatedVendor.company_name, updatedVendor.email, updatedVendor.status === 'ACTIVE']
      );
    }

    await logActivity(client, {
      userId: actorId,
      action: 'VENDOR_UPDATED',
      entityType: 'vendor',
      entityId: updatedVendor.id,
      description: `Vendor updated: ${updatedVendor.company_name}`,
    });

    await client.query('COMMIT');
    return sanitizeVendorRow(updatedVendor);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteVendor(vendorId, actor) {
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `
        SELECT id, company_name, email
        FROM vendors
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [vendorId]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError(404, 'Vendor not found.');
    }

    const existingVendor = existingResult.rows[0];

    await client.query(
      `
        DELETE FROM users
        WHERE vendor_id = $1
           OR (LOWER(email) = LOWER($2) AND role = 'VENDOR');
      `,
      [vendorId, existingVendor.email]
    );

    await logActivity(client, {
      userId: actorId,
      action: 'VENDOR_DELETED',
      entityType: 'vendor',
      entityId: existingVendor.id,
      description: `Vendor deleted: ${existingVendor.company_name}`,
    });

    await client.query('DELETE FROM vendors WHERE id = $1;', [vendorId]);

    await client.query('COMMIT');
    return { id: existingVendor.id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createHttpError,
  sanitizeVendorRow,
  validateVendorInput,
  createVendor,
  listVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
};
