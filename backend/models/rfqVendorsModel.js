async function createRfqVendorsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rfq_vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rfq_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_rfq_vendors_rfq
        FOREIGN KEY (rfq_id)
        REFERENCES rfqs (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_rfq_vendors_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT uq_rfq_vendors_assignment UNIQUE (rfq_id, vendor_id)
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_rfq_vendors_rfq_id ON rfq_vendors (rfq_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_rfq_vendors_vendor_id ON rfq_vendors (vendor_id);');
}

module.exports = {
  createRfqVendorsTable,
};
