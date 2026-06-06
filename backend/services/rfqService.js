const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const ALLOWED_RFQ_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'VENDOR_SELECTED'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeRfqRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    quantity: Number(row.quantity),
    deadline: row.deadline,
    attachment_url: row.attachment_url,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sanitizeVendorRfqRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    quantity: Number(row.quantity),
    deadline: row.deadline,
    attachment_url: row.attachment_url,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sanitizeAssignedVendorRow(row) {
  if (!row) {
    return null;
  }

  return {
    assignment_id: row.assignment_id,
    assigned_at: row.assigned_at,
    id: row.id,
    company_name: row.company_name,
    gst_number: row.gst_number,
    category: row.category,
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateDeadline(value, errors) {
  const deadlineText = normalizeOptionalText(value);
  const deadline = deadlineText ? new Date(deadlineText) : null;

  if (!deadlineText || Number.isNaN(deadline.getTime())) {
    errors.push('deadline must be a valid future date.');
    return undefined;
  }

  if (deadline.getTime() <= Date.now()) {
    errors.push('deadline must be a future date.');
    return undefined;
  }

  return deadline.toISOString();
}

function validateRfqInput(input, isUpdate = false) {
  const payload = input || {};
  const errors = [];
  const sanitized = {};

  if (payload.title !== undefined) {
    const title = normalizeOptionalText(payload.title);
    if (!title) {
      errors.push('title is required.');
    } else {
      sanitized.title = title;
    }
  } else if (!isUpdate) {
    errors.push('title is required.');
  }

  if (payload.description !== undefined) {
    const description = normalizeOptionalText(payload.description);
    if (!description) {
      errors.push('description is required.');
    } else {
      sanitized.description = description;
    }
  } else if (!isUpdate) {
    errors.push('description is required.');
  }

  if (payload.quantity !== undefined) {
    const quantity = Number(payload.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push('quantity must be greater than 0.');
    } else {
      sanitized.quantity = quantity;
    }
  } else if (!isUpdate) {
    errors.push('quantity is required.');
  }

  if (payload.deadline !== undefined) {
    const deadline = validateDeadline(payload.deadline, errors);
    if (deadline) {
      sanitized.deadline = deadline;
    }
  } else if (!isUpdate) {
    errors.push('deadline is required.');
  }

  if (payload.attachment_url !== undefined) {
    sanitized.attachment_url = normalizeOptionalText(payload.attachment_url);
  }

  if (payload.status !== undefined) {
    const status = normalizeOptionalText(payload.status);
    const normalizedStatus = status ? status.toUpperCase() : null;
    if (!normalizedStatus || !ALLOWED_RFQ_STATUSES.includes(normalizedStatus)) {
      errors.push(`status must be one of: ${ALLOWED_RFQ_STATUSES.join(', ')}.`);
    } else {
      sanitized.status = normalizedStatus;
    }
  } else if (!isUpdate) {
    sanitized.status = 'DRAFT';
  }

  if (errors.length > 0) {
    throw createHttpError(400, errors.join(' '));
  }

  if (isUpdate && Object.keys(sanitized).length === 0) {
    throw createHttpError(400, 'At least one RFQ field must be provided for update.');
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

function buildRfqWhereClause(query) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (query.status) {
    const status = String(query.status).trim().toUpperCase();
    if (!ALLOWED_RFQ_STATUSES.includes(status)) {
      throw createHttpError(400, `status must be one of: ${ALLOWED_RFQ_STATUSES.join(', ')}.`);
    }

    values.push(status);
    conditions.push(`status = $${paramIndex}`);
    paramIndex += 1;
  }

  if (query.search) {
    values.push(`%${String(query.search).trim()}%`);
    conditions.push(`(
      title ILIKE $${paramIndex}
      OR description ILIKE $${paramIndex}
      OR COALESCE(attachment_url, '') ILIKE $${paramIndex}
    )`);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
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

async function ensureVendorUserCanAccessVendor(client, vendorId, actor) {
  if (!actor || String(actor.role).toUpperCase() !== 'VENDOR') {
    return;
  }

  const result = await client.query(
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

  if (result.rowCount === 0) {
    throw createHttpError(403, 'Vendors can only access RFQs assigned to their active vendor profile.');
  }
}

async function ensureVendorUserCanAccessRfq(client, rfqId, actor) {
  if (!actor || String(actor.role).toUpperCase() !== 'VENDOR') {
    return;
  }

  const result = await client.query(
    `
      SELECT rv.id
      FROM rfq_vendors rv
      JOIN vendors v ON v.id = rv.vendor_id
      WHERE rv.rfq_id = $1
        AND v.email = $2
        AND v.status = 'ACTIVE'
      LIMIT 1;
    `,
    [rfqId, actor.email]
  );

  if (result.rowCount === 0) {
    throw createHttpError(403, 'Vendors can only access RFQs assigned to them.');
  }
}

async function createRfq(payload, actor) {
  const rfqInput = validateRfqInput(payload, false);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        INSERT INTO rfqs (title, description, quantity, deadline, attachment_url, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, description, quantity, deadline, attachment_url, status, created_by, created_at, updated_at;
      `,
      [
        rfqInput.title,
        rfqInput.description,
        rfqInput.quantity,
        rfqInput.deadline,
        rfqInput.attachment_url,
        rfqInput.status,
        actorId,
      ]
    );

    const rfq = result.rows[0];

    await logActivity(client, {
      userId: actorId,
      action: 'RFQ_CREATED',
      entityType: 'rfq',
      entityId: rfq.id,
      description: `RFQ created: ${rfq.title}`,
    });

    await client.query('COMMIT');
    return sanitizeRfqRow(rfq);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listRfqs(query) {
  const { page, limit, offset } = parsePagination(query || {});
  const { whereClause, values } = buildRfqWhereClause(query || {});

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM rfqs ${whereClause};`, values);
  const dataResult = await pool.query(
    `
      SELECT id, title, description, quantity, deadline, attachment_url, status, created_by, created_at, updated_at
      FROM rfqs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `,
    [...values, limit, offset]
  );

  const total = countResult.rows[0].total;

  return {
    rfqs: dataResult.rows.map(sanitizeRfqRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getRfqById(rfqId, actor) {
  const client = await pool.connect();

  try {
    const isVendor = actor && String(actor.role).toUpperCase() === 'VENDOR';
    await ensureVendorUserCanAccessRfq(client, rfqId, actor);

    const result = await client.query(
      `
        SELECT id, title, description, quantity, deadline, attachment_url, status, created_by, created_at, updated_at
        FROM rfqs
        WHERE id = $1
        LIMIT 1;
      `,
      [rfqId]
    );

    if (result.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    return isVendor ? sanitizeVendorRfqRow(result.rows[0]) : sanitizeRfqRow(result.rows[0]);
  } finally {
    client.release();
  }
}

async function updateRfq(rfqId, payload, actor) {
  const rfqInput = validateRfqInput(payload, true);
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `
        SELECT id, title
        FROM rfqs
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [rfqId]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const result = await client.query(
      `
        UPDATE rfqs
        SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          quantity = COALESCE($4, quantity),
          deadline = COALESCE($5, deadline),
          attachment_url = COALESCE($6, attachment_url),
          status = COALESCE($7, status)
        WHERE id = $1
        RETURNING id, title, description, quantity, deadline, attachment_url, status, created_by, created_at, updated_at;
      `,
      [
        rfqId,
        rfqInput.title ?? null,
        rfqInput.description ?? null,
        rfqInput.quantity ?? null,
        rfqInput.deadline ?? null,
        rfqInput.attachment_url === undefined ? null : rfqInput.attachment_url,
        rfqInput.status ?? null,
      ]
    );

    const rfq = result.rows[0];

    await logActivity(client, {
      userId: actorId,
      action: 'RFQ_UPDATED',
      entityType: 'rfq',
      entityId: rfq.id,
      description: `RFQ updated: ${rfq.title}`,
    });

    await client.query('COMMIT');
    return sanitizeRfqRow(rfq);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteRfq(rfqId, actor) {
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `
        SELECT id, title
        FROM rfqs
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [rfqId]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const rfq = existingResult.rows[0];

    await logActivity(client, {
      userId: actorId,
      action: 'RFQ_DELETED',
      entityType: 'rfq',
      entityId: rfq.id,
      description: `RFQ deleted: ${rfq.title}`,
    });

    await client.query('DELETE FROM rfqs WHERE id = $1;', [rfqId]);
    await client.query('COMMIT');

    return { id: rfq.id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function validateVendorIds(payload) {
  const vendorIds = payload && payload.vendorIds;

  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw createHttpError(400, 'vendorIds must be a non-empty array.');
  }

  const normalizedVendorIds = vendorIds.map((id) => normalizeOptionalText(id));

  if (normalizedVendorIds.some((id) => !id)) {
    throw createHttpError(400, 'vendorIds must contain valid vendor ids.');
  }

  if (new Set(normalizedVendorIds).size !== normalizedVendorIds.length) {
    throw createHttpError(409, 'Duplicate vendor ids are not allowed in the assignment request.');
  }

  return normalizedVendorIds;
}

async function assignVendorsToRfq(rfqId, payload, actor) {
  const vendorIds = validateVendorIds(payload || {});
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rfqResult = await client.query(
      `
        SELECT id, title
        FROM rfqs
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [rfqId]
    );

    if (rfqResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const vendorsResult = await client.query(
      `
        SELECT id, company_name, email, status
        FROM vendors
        WHERE id = ANY($1::uuid[]);
      `,
      [vendorIds]
    );

    if (vendorsResult.rowCount !== vendorIds.length) {
      throw createHttpError(404, 'One or more vendors were not found.');
    }

    const inactiveVendor = vendorsResult.rows.find((vendor) => vendor.status !== 'ACTIVE');
    if (inactiveVendor) {
      throw createHttpError(400, `Vendor must be ACTIVE before assignment: ${inactiveVendor.company_name}.`);
    }

    const duplicateResult = await client.query(
      `
        SELECT vendor_id
        FROM rfq_vendors
        WHERE rfq_id = $1
          AND vendor_id = ANY($2::uuid[]);
      `,
      [rfqId, vendorIds]
    );

    if (duplicateResult.rowCount > 0) {
      throw createHttpError(409, 'One or more vendors are already assigned to this RFQ.');
    }

    const assignmentResult = await client.query(
      `
        INSERT INTO rfq_vendors (rfq_id, vendor_id)
        SELECT $1, vendor_id
        FROM UNNEST($2::uuid[]) AS vendor_id
        RETURNING id, rfq_id, vendor_id, assigned_at;
      `,
      [rfqId, vendorIds]
    );

    const notificationUsersResult = await client.query(
      `
        SELECT u.id, u.email
        FROM users u
        JOIN vendors v ON v.email = u.email
        WHERE v.id = ANY($1::uuid[])
          AND u.role = 'VENDOR'
          AND u.is_active = TRUE;
      `,
      [vendorIds]
    );

    for (const user of notificationUsersResult.rows) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, $2, $3);
        `,
        [user.id, 'New RFQ Assigned', 'New RFQ assigned to you.']
      );
    }

    await logActivity(client, {
      userId: actorId,
      action: 'RFQ_VENDORS_ASSIGNED',
      entityType: 'rfq',
      entityId: rfqId,
      description: `Vendors assigned to RFQ: ${rfqResult.rows[0].title}`,
    });

    await client.query('COMMIT');

    return {
      rfq_id: rfqId,
      assignedVendorIds: assignmentResult.rows.map((assignment) => assignment.vendor_id),
      assignments: assignmentResult.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getRfqVendors(rfqId, actor) {
  const client = await pool.connect();

  try {
    if (actor && String(actor.role).toUpperCase() === 'VENDOR') {
      throw createHttpError(403, 'Vendors cannot view RFQ vendor assignment details.');
    }

    const rfqResult = await client.query('SELECT id FROM rfqs WHERE id = $1 LIMIT 1;', [rfqId]);
    if (rfqResult.rowCount === 0) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const result = await client.query(
      `
        SELECT
          rv.id AS assignment_id,
          rv.assigned_at,
          v.id,
          v.company_name,
          v.gst_number,
          v.category,
          v.email,
          v.phone,
          v.address,
          v.status,
          v.created_at,
          v.updated_at
        FROM rfq_vendors rv
        JOIN vendors v ON v.id = rv.vendor_id
        WHERE rv.rfq_id = $1
        ORDER BY rv.assigned_at DESC;
      `,
      [rfqId]
    );

    return result.rows.map(sanitizeAssignedVendorRow);
  } finally {
    client.release();
  }
}

async function getVendorRfqs(vendorId, actor) {
  const client = await pool.connect();

  try {
    const isVendor = actor && String(actor.role).toUpperCase() === 'VENDOR';
    await ensureVendorUserCanAccessVendor(client, vendorId, actor);

    const vendorResult = await client.query('SELECT id FROM vendors WHERE id = $1 LIMIT 1;', [vendorId]);
    if (vendorResult.rowCount === 0) {
      throw createHttpError(404, 'Vendor not found.');
    }

    const result = await client.query(
      `
        SELECT r.id, r.title, r.description, r.quantity, r.deadline, r.attachment_url, r.status, r.created_by, r.created_at, r.updated_at
        FROM rfq_vendors rv
        JOIN rfqs r ON r.id = rv.rfq_id
        WHERE rv.vendor_id = $1
        ORDER BY rv.assigned_at DESC;
      `,
      [vendorId]
    );

    return result.rows.map(isVendor ? sanitizeVendorRfqRow : sanitizeRfqRow);
  } finally {
    client.release();
  }
}

module.exports = {
  ALLOWED_RFQ_STATUSES,
  createRfq,
  listRfqs,
  getRfqById,
  updateRfq,
  deleteRfq,
  assignVendorsToRfq,
  getRfqVendors,
  getVendorRfqs,
};
