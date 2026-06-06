async function createUsersTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL CHECK (role IN ('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);');
}

module.exports = {
  createUsersTable,
};
