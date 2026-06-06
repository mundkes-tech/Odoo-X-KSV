async function createVendorsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name VARCHAR(200) NOT NULL,
      gst_number VARCHAR(50) NOT NULL UNIQUE,
      category VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(25) NOT NULL,
      address TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'BLACKLISTED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors (category);');
}

module.exports = {
  createVendorsTable,
};
