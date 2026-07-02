const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_ALLOWED_ROLES = ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'];
const INTERNAL_ALLOWED_ROLES = [...PUBLIC_ALLOWED_ROLES, 'VENDOR'];
const DEFAULT_VENDOR_TEMP_PASSWORD = process.env.VENDOR_TEMP_PASSWORD || 'Vendor@123';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeUserRow(userRow) {
  if (!userRow) {
    return null;
  }

  return {
    id: userRow.id,
    full_name: userRow.full_name,
    email: userRow.email,
    role: userRow.role,
    vendor_id: userRow.vendor_id || null,
    is_active: userRow.is_active,
    created_at: userRow.created_at,
    updated_at: userRow.updated_at,
  };
}

function validateRegisterInput({ full_name, email, password, role }, allowedRoles = PUBLIC_ALLOWED_ROLES) {
  if (!full_name || !String(full_name).trim()) {
    throw createHttpError(400, 'full_name is required.');
  }

  if (!email || !String(email).trim()) {
    throw createHttpError(400, 'email is required.');
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw createHttpError(400, 'email format is invalid.');
  }

  if (!password || String(password).length < 8) {
    throw createHttpError(400, 'password is required and must be at least 8 characters.');
  }

  if (!role || !String(role).trim()) {
    throw createHttpError(400, 'role is required.');
  }

  const normalizedRole = String(role).trim().toUpperCase();

  if (normalizedRole === 'VENDOR' && !allowedRoles.includes('VENDOR')) {
    throw createHttpError(400, 'Vendor accounts must be created through Vendor Management.');
  }

  if (!allowedRoles.includes(normalizedRole)) {
    throw createHttpError(400, `role must be one of: ${allowedRoles.join(', ')}.`);
  }

  return {
    full_name: String(full_name).trim(),
    email: String(email).trim().toLowerCase(),
    password: String(password),
    role: normalizedRole,
  };
}

async function createUserAccount(payload, options = {}) {
  const allowedRoles = options.allowedRoles || INTERNAL_ALLOWED_ROLES;
  const vendorId = options.vendorId || null;
  const isActive = options.isActive !== undefined ? Boolean(options.isActive) : true;
  const db = options.client || pool;

  const { full_name, email, password, role } = validateRegisterInput(payload, allowedRoles);

  const existingUser = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1;', [email]);

  if (existingUser.rowCount > 0) {
    throw createHttpError(409, 'A user with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const insertResult = await db.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, vendor_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, email, role, vendor_id, is_active, created_at, updated_at;
    `,
    [full_name, email, passwordHash, role, vendorId, isActive]
  );

  return insertResult.rows[0];
}

function validateLoginInput({ email, password }) {
  if (!email || !String(email).trim()) {
    throw createHttpError(400, 'email is required.');
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw createHttpError(400, 'email format is invalid.');
  }

  if (!password || !String(password)) {
    throw createHttpError(400, 'password is required.');
  }

  return {
    email: String(email).trim().toLowerCase(),
    password: String(password),
  };
}

async function registerUser(payload) {
  const user = await createUserAccount(payload, { allowedRoles: PUBLIC_ALLOWED_ROLES, isActive: true });
  return sanitizeUserRow(user);
}

async function loginUser(payload) {
  const { email, password } = validateLoginInput(payload);

  const userResult = await pool.query(
    `
      SELECT id, full_name, email, password_hash, role, vendor_id, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
      LIMIT 1;
    `,
    [email]
  );

  if (userResult.rowCount === 0) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw createHttpError(403, 'Your account is inactive. Contact an administrator.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

  return {
    token,
    user: sanitizeUserRow(user),
  };
}

async function getUserProfileById(userId) {
  const userResult = await pool.query(
    `
      SELECT id, full_name, email, role, vendor_id, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `,
    [userId]
  );

  if (userResult.rowCount === 0) {
    throw createHttpError(404, 'User not found.');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw createHttpError(403, 'Your account is inactive. Contact an administrator.');
  }

  return sanitizeUserRow(user);
}

async function getAllUsers() {
  const result = await pool.query(
    `SELECT id, full_name, email, role, vendor_id, is_active, created_at, updated_at FROM users ORDER BY created_at DESC;`
  );
  return result.rows.map(sanitizeUserRow);
}

async function updateUserById(userId, payload) {
  const { full_name, email, role, is_active } = payload;
  const result = await pool.query(
    `UPDATE users 
     SET full_name = COALESCE($2, full_name),
         email = COALESCE($3, email),
         role = COALESCE($4, role),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, full_name, email, role, vendor_id, is_active, created_at, updated_at;`,
    [userId, full_name, email, role, is_active]
  );
  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found.');
  }
  return sanitizeUserRow(result.rows[0]);
}

async function resetUserPasswordById(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const result = await pool.query(
    `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING id;`,
    [userId, passwordHash]
  );
  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found.');
  }
  return { success: true };
}

module.exports = {
  PUBLIC_ALLOWED_ROLES,
  INTERNAL_ALLOWED_ROLES,
  DEFAULT_VENDOR_TEMP_PASSWORD,
  createHttpError,
  sanitizeUserRow,
  createUserAccount,
  registerUser,
  loginUser,
  getUserProfileById,
  getAllUsers,
  updateUserById,
  resetUserPasswordById,
};

