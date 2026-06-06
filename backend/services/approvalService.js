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

// ── Create Approval Request (Procurement Officer) ──────────────────────

async function createApproval(payload, actor) {
  if (!payload || !payload.quotationId) {
    throw createHttpError(400, 'quotationId is required.');
  }

  const validQuotationId = assertUuid(payload.quotationId, 'quotationId');
  const actorId = actor && actor.id ? actor.id : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch quotation and verify status is SELECTED
    const quotationResult = await client.query(
      `
        SELECT q.id, q.rfq_id, q.status, q.price, v.company_name AS vendor_name, r.title AS rfq_title
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

    if (quotation.status !== 'SELECTED') {
      throw createHttpError(400, 'Quotation must be in SELECTED status to initiate approval.');
    }

    // 2. Check if an approval request already exists for this quotation
    const existingApproval = await client.query(
      `SELECT id, status FROM approvals WHERE quotation_id = $1 LIMIT 1;`,
      [validQuotationId]
    );

    if (existingApproval.rowCount > 0) {
      throw createHttpError(409, 'Approval request already exists for this quotation.');
    }

    // 3. Create the approval request
    const insertResult = await client.query(
      `
        INSERT INTO approvals (quotation_id, status)
        VALUES ($1, 'PENDING')
        RETURNING id, quotation_id, status, created_at;
      `,
      [validQuotationId]
    );

    const approval = insertResult.rows[0];

    // 4. Notify all Managers
    const managersResult = await client.query(
      `SELECT id FROM users WHERE role = 'MANAGER' AND is_active = TRUE;`
    );

    for (const mgr of managersResult.rows) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, 'Approval Requested', $2);
        `,
        [mgr.id, `New approval request submitted for RFQ "${quotation.rfq_title}" (Quotation ID: ${validQuotationId})`]
      );
    }

    // 5. Log activity
    await logActivity(client, {
      userId: actorId,
      action: 'APPROVAL_REQUESTED',
      entityType: 'approval',
      entityId: approval.id,
      description: `Approval requested for RFQ "${quotation.rfq_title}" and quotation ${validQuotationId}`,
    });

    await client.query('COMMIT');

    return {
      approval_id: approval.id,
      quotation_id: approval.quotation_id,
      status: approval.status,
      created_at: approval.created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Approve Approval Request (Manager) ──────────────────────────────────

async function approveApproval(approvalId, payload, actor) {
  const validApprovalId = assertUuid(approvalId, 'approvalId');
  const actorId = actor && actor.id ? actor.id : null;
  const remarks = payload && payload.remarks ? String(payload.remarks).trim() : 'Approved';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch approval and lock it
    const approvalResult = await client.query(
      `
        SELECT a.id, a.quotation_id, a.status, q.rfq_id, r.title AS rfq_title, r.created_by AS rfq_creator_id
        FROM approvals a
        JOIN quotations q ON q.id = a.quotation_id
        JOIN rfqs r ON r.id = q.rfq_id
        WHERE a.id = $1
        LIMIT 1
        FOR UPDATE OF a;
      `,
      [validApprovalId]
    );

    if (approvalResult.rowCount === 0) {
      throw createHttpError(404, 'Approval request not found.');
    }

    const approval = approvalResult.rows[0];

    if (approval.status !== 'PENDING') {
      throw createHttpError(409, `Cannot approve: request is already ${approval.status}.`);
    }

    const approvedAt = new Date().toISOString();

    // 2. Update approvals table
    await client.query(
      `
        UPDATE approvals
        SET status = 'APPROVED', remarks = $2, manager_id = $3, approved_at = $4
        WHERE id = $1;
      `,
      [validApprovalId, remarks, actorId, approvedAt]
    );

    // 3. Update quotation status to APPROVED
    await client.query(
      `UPDATE quotations SET status = 'APPROVED' WHERE id = $1;`,
      [approval.quotation_id]
    );

    // 4. Update RFQ status to APPROVED
    await client.query(
      `UPDATE rfqs SET status = 'APPROVED' WHERE id = $1;`,
      [approval.rfq_id]
    );

    // 5. Notify the Procurement Officer (RFQ creator + all active POs)
    const POsResult = await client.query(
      `
        SELECT DISTINCT id
        FROM users
        WHERE (role = 'PROCUREMENT_OFFICER' OR id = $1) AND is_active = TRUE;
      `,
      [approval.rfq_creator_id]
    );

    for (const po of POsResult.rows) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, 'Approval Request Approved', $2);
        `,
        [po.id, `Approval request for RFQ "${approval.rfq_title}" has been APPROVED. Remarks: ${remarks}`]
      );
    }

    // 6. Log activity
    await logActivity(client, {
      userId: actorId,
      action: 'APPROVAL_APPROVED',
      entityType: 'approval',
      entityId: validApprovalId,
      description: `Approval request approved for RFQ "${approval.rfq_title}". Remarks: ${remarks}`,
    });

    await client.query('COMMIT');

    return {
      approval_id: validApprovalId,
      status: 'APPROVED',
      remarks,
      approved_at: approvedAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Reject Approval Request (Manager) ──────────────────────────────────

async function rejectApproval(approvalId, payload, actor) {
  const validApprovalId = assertUuid(approvalId, 'approvalId');
  const actorId = actor && actor.id ? actor.id : null;
  const remarks = payload && payload.remarks ? String(payload.remarks).trim() : 'Rejected';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch approval and lock it
    const approvalResult = await client.query(
      `
        SELECT a.id, a.quotation_id, a.status, q.rfq_id, r.title AS rfq_title, r.created_by AS rfq_creator_id
        FROM approvals a
        JOIN quotations q ON q.id = a.quotation_id
        JOIN rfqs r ON r.id = q.rfq_id
        WHERE a.id = $1
        LIMIT 1
        FOR UPDATE OF a;
      `,
      [validApprovalId]
    );

    if (approvalResult.rowCount === 0) {
      throw createHttpError(404, 'Approval request not found.');
    }

    const approval = approvalResult.rows[0];

    if (approval.status !== 'PENDING') {
      throw createHttpError(409, `Cannot reject: request is already ${approval.status}.`);
    }

    const rejectedAt = new Date().toISOString();

    // 2. Update approvals table
    await client.query(
      `
        UPDATE approvals
        SET status = 'REJECTED', remarks = $2, manager_id = $3, approved_at = $4
        WHERE id = $1;
      `,
      [validApprovalId, remarks, actorId, rejectedAt]
    );

    // 3. Update quotation status to REJECTED
    await client.query(
      `UPDATE quotations SET status = 'REJECTED' WHERE id = $1;`,
      [approval.quotation_id]
    );

    // 4. Update RFQ status to REJECTED
    await client.query(
      `UPDATE rfqs SET status = 'REJECTED' WHERE id = $1;`,
      [approval.rfq_id]
    );

    // 5. Notify the Procurement Officer (RFQ creator + all active POs)
    const POsResult = await client.query(
      `
        SELECT DISTINCT id
        FROM users
        WHERE (role = 'PROCUREMENT_OFFICER' OR id = $1) AND is_active = TRUE;
      `,
      [approval.rfq_creator_id]
    );

    for (const po of POsResult.rows) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, 'Approval Request Rejected', $2);
        `,
        [po.id, `Approval request for RFQ "${approval.rfq_title}" has been REJECTED. Remarks: ${remarks}`]
      );
    }

    // 6. Log activity
    await logActivity(client, {
      userId: actorId,
      action: 'APPROVAL_REJECTED',
      entityType: 'approval',
      entityId: validApprovalId,
      description: `Approval request rejected for RFQ "${approval.rfq_title}". Remarks: ${remarks}`,
    });

    await client.query('COMMIT');

    return {
      approval_id: validApprovalId,
      status: 'REJECTED',
      remarks,
      approved_at: rejectedAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── GET /approvals/:id ──────────────────────────────────────────────────

async function getApproval(approvalId, actor) {
  const validApprovalId = assertUuid(approvalId, 'approvalId');

  const result = await pool.query(
    `
      SELECT
        a.id AS approval_id,
        a.quotation_id,
        a.status AS approval_status,
        a.remarks,
        a.approved_at,
        a.created_at,
        u.id AS manager_id,
        u.full_name AS manager_name,
        u.email AS manager_email,
        q.rfq_id,
        q.price,
        q.delivery_days,
        v.company_name AS vendor_name
      FROM approvals a
      LEFT JOIN users u ON u.id = a.manager_id
      JOIN quotations q ON q.id = a.quotation_id
      JOIN vendors v ON v.id = q.vendor_id
      WHERE a.id = $1
      LIMIT 1;
    `,
    [validApprovalId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Approval request not found.');
  }

  const row = result.rows[0];

  return {
    approval: {
      id: row.approval_id,
      quotation_id: row.quotation_id,
      rfq_id: row.rfq_id,
      status: row.approval_status,
      remarks: row.remarks,
      approved_at: row.approved_at,
      created_at: row.created_at,
    },
    manager: row.manager_id ? {
      id: row.manager_id,
      full_name: row.manager_name,
      email: row.manager_email,
    } : null,
    quotation: {
      price: Number(row.price),
      delivery_days: Number(row.delivery_days),
      vendor_name: row.vendor_name,
    },
    timeline: {
      initiated_at: row.created_at,
      reviewed_at: row.approved_at || null,
      status: row.approval_status,
    }
  };
}

async function getApprovals(filters, actor) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const queryParams = [];
  const clauses = [];

  if (filters.status) {
    queryParams.push(String(filters.status).toUpperCase());
    clauses.push(`a.status = $${queryParams.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM approvals a ${whereClause};`,
    queryParams
  );
  const total = countResult.rows[0].total;

  queryParams.push(limit, offset);
  const result = await pool.query(
    `
      SELECT
        a.id AS approval_id,
        a.quotation_id,
        a.status AS approval_status,
        a.remarks,
        a.approved_at,
        a.created_at,
        u.full_name AS manager_name,
        q.rfq_id,
        q.price,
        v.company_name AS vendor_name,
        r.title AS rfq_title
      FROM approvals a
      LEFT JOIN users u ON u.id = a.manager_id
      JOIN quotations q ON q.id = a.quotation_id
      JOIN vendors v ON v.id = q.vendor_id
      JOIN rfqs r ON r.id = q.rfq_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `,
    queryParams
  );

  return {
    total,
    page,
    limit,
    approvals: result.rows.map(row => ({
      id: row.approval_id,
      quotation_id: row.quotation_id,
      rfq_id: row.rfq_id,
      rfq_title: row.rfq_title,
      status: row.approval_status,
      remarks: row.remarks,
      approved_at: row.approved_at,
      created_at: row.created_at,
      manager_name: row.manager_name,
      price: Number(row.price),
      vendor_name: row.vendor_name
    }))
  };
}

module.exports = {
  createApproval,
  approveApproval,
  rejectApproval,
  getApproval,
  getApprovals,
};
