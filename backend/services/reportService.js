const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORT_ROLES = ['ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'];
const LOG_ROLES = ['ADMIN', 'MANAGER'];

function assertUuid(value, fieldName) {
  if (!value || !UUID_REGEX.test(String(value).trim())) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return String(value).trim();
}

function ensureReportAccess(actor) {
  const role = actor && actor.role ? String(actor.role).toUpperCase() : null;
  if (!role || !REPORT_ROLES.includes(role)) {
    throw createHttpError(403, 'You do not have permission to access reports.');
  }
}

function ensureLogAccess(actor) {
  const role = actor && actor.role ? String(actor.role).toUpperCase() : null;
  if (!role || !LOG_ROLES.includes(role)) {
    throw createHttpError(403, 'You do not have permission to access activity logs.');
  }
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

function toNumber(value) {
  return Number(value || 0);
}

async function listActivityLogs(query, actor) {
  ensureLogAccess(actor);

  const { page, limit, offset } = parsePagination(query || {});
  const clauses = [];
  const values = [];

  if (query.entityType) {
    values.push(String(query.entityType).trim());
    clauses.push(`al.entity_type = $${values.length}`);
  }

  if (query.action) {
    values.push(String(query.action).trim());
    clauses.push(`al.action = $${values.length}`);
  }

  if (query.userId) {
    values.push(assertUuid(query.userId, 'userId'));
    clauses.push(`al.user_id = $${values.length}`);
  }

  if (query.search) {
    values.push(`%${String(query.search).trim()}%`);
    clauses.push(`(
      al.description ILIKE $${values.length}
      OR al.action ILIKE $${values.length}
      OR al.entity_type ILIKE $${values.length}
      OR COALESCE(u.full_name, '') ILIKE $${values.length}
      OR COALESCE(u.email, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause};
    `,
    values
  );

  const rowsResult = await pool.query(
    `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.description,
        al.created_at,
        u.full_name,
        u.email,
        u.role
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `,
    [...values, limit, offset]
  );

  const total = countResult.rows[0].total;

  return {
    activity_logs: rowsResult.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      description: row.description,
      created_at: row.created_at,
      user: row.user_id
        ? {
            full_name: row.full_name,
            email: row.email,
            role: row.role,
          }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getActivityLogById(activityLogId, actor) {
  ensureLogAccess(actor);
  const validId = assertUuid(activityLogId, 'activityLogId');

  const result = await pool.query(
    `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.description,
        al.created_at,
        u.full_name,
        u.email,
        u.role
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.id = $1
      LIMIT 1;
    `,
    [validId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Activity log not found.');
  }

  const row = result.rows[0];

  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    description: row.description,
    created_at: row.created_at,
    user: row.user_id
      ? {
          full_name: row.full_name,
          email: row.email,
          role: row.role,
        }
      : null,
  };
}

async function getVendorPerformanceReport(vendorId, actor) {
  ensureReportAccess(actor);
  const validVendorId = assertUuid(vendorId, 'vendorId');

  const vendorResult = await pool.query(
    `SELECT id, company_name FROM vendors WHERE id = $1 LIMIT 1;`,
    [validVendorId]
  );

  if (vendorResult.rowCount === 0) {
    throw createHttpError(404, 'Vendor not found.');
  }

  const [rfqCountResult, submittedResult, wonResult, averageDeliveryResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM rfq_vendors WHERE vendor_id = $1;`, [validVendorId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM quotations WHERE vendor_id = $1;`, [validVendorId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM quotations WHERE vendor_id = $1 AND status = 'SELECTED';`, [validVendorId]),
    pool.query(
      `
        SELECT COALESCE(AVG(delivery_days), 0)::numeric(14,2) AS average_delivery_days
        FROM quotations
        WHERE vendor_id = $1 AND status = 'SELECTED';
      `,
      [validVendorId]
    ),
  ]);

  const totalRFQs = toNumber(rfqCountResult.rows[0].total);
  const quotationsSubmitted = toNumber(submittedResult.rows[0].total);
  const quotationsWon = toNumber(wonResult.rows[0].total);
  const winRate = quotationsSubmitted > 0 ? Number(((quotationsWon / quotationsSubmitted) * 100).toFixed(2)) : 0;
  const averageDeliveryDays = Number(averageDeliveryResult.rows[0].average_delivery_days || 0);

  return {
    vendorId: vendorResult.rows[0].id,
    vendorName: vendorResult.rows[0].company_name,
    totalRFQs,
    quotationsSubmitted,
    quotationsWon,
    winRate,
    averageDeliveryDays,
  };
}

async function getSpendingReport(query, actor) {
  ensureReportAccess(actor);

  const clauses = [];
  const values = [];

  if (query.vendorId) {
    values.push(assertUuid(query.vendorId, 'vendorId'));
    clauses.push(`po.vendor_id = $${values.length}`);
  }

  if (query.from) {
    const fromDate = new Date(String(query.from));
    if (Number.isNaN(fromDate.getTime())) {
      throw createHttpError(400, 'from must be a valid date.');
    }
    values.push(fromDate.toISOString());
    clauses.push(`inv.created_at >= $${values.length}`);
  }

  if (query.to) {
    const toDate = new Date(String(query.to));
    if (Number.isNaN(toDate.getTime())) {
      throw createHttpError(400, 'to must be a valid date.');
    }
    values.push(toDate.toISOString());
    clauses.push(`inv.created_at <= $${values.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const [totalResult, byVendorResult, byMonthResult, byStatusResult] = await Promise.all([
    pool.query(
      `
        SELECT COALESCE(SUM(inv.total_amount), 0)::numeric(14,2) AS total_spending
        FROM invoices inv
        JOIN purchase_orders po ON po.id = inv.purchase_order_id
        ${whereClause};
      `,
      values
    ),
    pool.query(
      `
        SELECT
          po.vendor_id,
          v.company_name AS vendor_name,
          COALESCE(SUM(inv.total_amount), 0)::numeric(14,2) AS total_spending
        FROM invoices inv
        JOIN purchase_orders po ON po.id = inv.purchase_order_id
        JOIN vendors v ON v.id = po.vendor_id
        ${whereClause}
        GROUP BY po.vendor_id, v.company_name
        ORDER BY total_spending DESC, v.company_name ASC;
      `,
      values
    ),
    pool.query(
      `
        SELECT
          to_char(date_trunc('month', inv.created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(inv.total_amount), 0)::numeric(14,2) AS total_spending
        FROM invoices inv
        JOIN purchase_orders po ON po.id = inv.purchase_order_id
        ${whereClause}
        GROUP BY 1
        ORDER BY 1;
      `,
      values
    ),
    pool.query(
      `
        SELECT inv.status, COALESCE(SUM(inv.total_amount), 0)::numeric(14,2) AS total_spending
        FROM invoices inv
        JOIN purchase_orders po ON po.id = inv.purchase_order_id
        ${whereClause}
        GROUP BY inv.status
        ORDER BY inv.status;
      `,
      values
    ),
  ]);

  return {
    totalSpending: Number(totalResult.rows[0].total_spending || 0),
    spendingByVendor: byVendorResult.rows.map((row) => ({
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      totalSpending: Number(row.total_spending || 0),
    })),
    spendingByMonth: byMonthResult.rows.map((row) => ({
      month: row.month,
      totalSpending: Number(row.total_spending || 0),
    })),
    spendingByStatus: byStatusResult.rows.map((row) => ({
      status: row.status,
      totalSpending: Number(row.total_spending || 0),
    })),
  };
}

async function getMonthlyTrendsReport(actor) {
  ensureReportAccess(actor);

  const months = [];
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);

  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - i, 1));
    months.push(monthDate.toISOString().slice(0, 7));
  }

  const monthlyQuery = async (tableName) => {
    const result = await pool.query(
      `
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS total
        FROM ${tableName}
        WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY 1
        ORDER BY 1;
      `
    );

    return result.rows.reduce((accumulator, row) => {
      accumulator[row.month] = row.total;
      return accumulator;
    }, {});
  };

  const [rfqsByMonth, quotationsByMonth, purchaseOrdersByMonth, invoicesByMonth] = await Promise.all([
    monthlyQuery('rfqs'),
    monthlyQuery('quotations'),
    monthlyQuery('purchase_orders'),
    monthlyQuery('invoices'),
  ]);

  return {
    rfqsCreatedPerMonth: months.map((month) => ({ month, total: rfqsByMonth[month] || 0 })),
    quotationsSubmittedPerMonth: months.map((month) => ({ month, total: quotationsByMonth[month] || 0 })),
    purchaseOrdersGeneratedPerMonth: months.map((month) => ({ month, total: purchaseOrdersByMonth[month] || 0 })),
    invoicesGeneratedPerMonth: months.map((month) => ({ month, total: invoicesByMonth[month] || 0 })),
  };
}

async function getDashboardSummary(actor) {
  ensureReportAccess(actor);

  const [vendorsResult, rfqsResult, quotationsResult, purchaseOrdersResult, invoicesResult, spendingResult, approvalsResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM vendors;`),
    pool.query(`SELECT COUNT(*)::int AS total FROM rfqs;`),
    pool.query(`SELECT COUNT(*)::int AS total FROM quotations;`),
    pool.query(`SELECT COUNT(*)::int AS total FROM purchase_orders;`),
    pool.query(`SELECT COUNT(*)::int AS total FROM invoices;`),
    pool.query(`SELECT COALESCE(SUM(total_amount), 0)::numeric(14,2) AS total_spending FROM invoices;`),
    pool.query(`SELECT COUNT(*)::int AS total FROM approvals WHERE status = 'PENDING';`),
  ]);

  return {
    totalVendors: toNumber(vendorsResult.rows[0].total),
    totalRFQs: toNumber(rfqsResult.rows[0].total),
    totalQuotations: toNumber(quotationsResult.rows[0].total),
    totalPurchaseOrders: toNumber(purchaseOrdersResult.rows[0].total),
    totalInvoices: toNumber(invoicesResult.rows[0].total),
    totalSpending: Number(spendingResult.rows[0].total_spending || 0),
    pendingApprovals: toNumber(approvalsResult.rows[0].total),
  };
}

module.exports = {
  getVendorPerformanceReport,
  getSpendingReport,
  getMonthlyTrendsReport,
  getDashboardSummary,
  listActivityLogs,
  getActivityLogById,
};