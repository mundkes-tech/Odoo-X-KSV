async function createQuotationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rfq_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
      delivery_days INTEGER NOT NULL CHECK (delivery_days >= 0),
      comments TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_quotations_rfq
        FOREIGN KEY (rfq_id)
        REFERENCES rfqs (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_quotations_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
      CONSTRAINT uq_quotations_rfq_vendor UNIQUE (rfq_id, vendor_id)
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_quotations_rfq_id ON quotations (rfq_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_quotations_vendor_id ON quotations (vendor_id);');
}

module.exports = {
  createQuotationsTable,
};
