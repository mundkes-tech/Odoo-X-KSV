async function createUsersTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL CHECK (role IN ('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER')),
      vendor_id UUID,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);');
}

async function syncUserVendorLinkage(pool) {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_id UUID;');
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_vendor'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT fk_users_vendor
          FOREIGN KEY (vendor_id)
          REFERENCES vendors (id)
          ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_vendor_id ON users (vendor_id) WHERE vendor_id IS NOT NULL;');
  await pool.query(`
    UPDATE users u
    SET vendor_id = v.id
    FROM vendors v
    WHERE LOWER(u.email) = LOWER(v.email)
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NULL;
  `);
}

module.exports = {
  createUsersTable,
  syncUserVendorLinkage,
};
