const { pool } = require('../config/db');
const { createHttpError } = require('./vendorService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value, fieldName) {
  if (!value || !UUID_REGEX.test(String(value).trim())) {
    throw createHttpError(400, `${fieldName} must be a valid UUID.`);
  }
  return String(value).trim();
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

function sanitizeNotification(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

async function getNotifications(query, actor) {
  const { page, limit, offset } = parsePagination(query || {});
  const clauses = ['n.user_id = $1'];
  const values = [actor.id];

  if (query.isRead !== undefined) {
    const normalized = String(query.isRead).trim().toLowerCase();
    if (!['true', 'false'].includes(normalized)) {
      throw createHttpError(400, 'isRead must be true or false.');
    }

    values.push(normalized === 'true');
    clauses.push(`n.is_read = $${values.length}`);
  }

  if (query.search) {
    values.push(`%${String(query.search).trim()}%`);
    clauses.push(`(n.title ILIKE $${values.length} OR n.message ILIKE $${values.length})`);
  }

  const whereClause = `WHERE ${clauses.join(' AND ')}`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM notifications n
      ${whereClause};
    `,
    values
  );

  const rowsResult = await pool.query(
    `
      SELECT n.id, n.user_id, n.title, n.message, n.is_read, n.created_at
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `,
    [...values, limit, offset]
  );

  const total = countResult.rows[0].total;

  return {
    notifications: rowsResult.rows.map(sanitizeNotification),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function markNotificationRead(notificationId, actor) {
  const validId = assertUuid(notificationId, 'notificationId');

  const result = await pool.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, title, message, is_read, created_at;
    `,
    [validId, actor.id]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'Notification not found.');
  }

  return sanitizeNotification(result.rows[0]);
}

async function markAllNotificationsRead(actor) {
  const result = await pool.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE;
    `,
    [actor.id]
  );

  return {
    updatedCount: result.rowCount,
  };
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};