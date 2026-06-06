async function createPurchaseOrdersTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number VARCHAR(80) NOT NULL UNIQUE,
      quotation_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
      status VARCHAR(30) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'SENT', 'ACKNOWLEDGED', 'CANCELLED', 'CLOSED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_purchase_orders_quotation
        FOREIGN KEY (quotation_id)
        REFERENCES quotations (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
      CONSTRAINT fk_purchase_orders_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders (vendor_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation_id ON purchase_orders (quotation_id);');
}

module.exports = {
  createPurchaseOrdersTable,
};
