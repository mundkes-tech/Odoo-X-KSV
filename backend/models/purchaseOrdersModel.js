async function createPurchaseOrdersTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number VARCHAR(80) NOT NULL UNIQUE,
      quotation_id UUID NOT NULL,
      vendor_id UUID NOT NULL,
      total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
      status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
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

  // Migrate any old statuses to CREATED before applying new constraint
  await pool.query(`
    UPDATE purchase_orders
    SET status = 'CREATED'
    WHERE status NOT IN ('CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED');
  `);

  // Re-create the status check constraint
  await pool.query('ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;');
  await pool.query(`
    ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED'));
  `);

  // Add UNIQUE constraint on quotation_id
  await pool.query('ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS uq_purchase_orders_quotation;');
  await pool.query('ALTER TABLE purchase_orders ADD CONSTRAINT uq_purchase_orders_quotation UNIQUE (quotation_id);');

  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders (vendor_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation_id ON purchase_orders (quotation_id);');
}

module.exports = {
  createPurchaseOrdersTable,
};
