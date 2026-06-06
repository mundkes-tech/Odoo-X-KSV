async function createInvoicesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(80) NOT NULL UNIQUE,
      purchase_order_id UUID NOT NULL,
      subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
      tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
      total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
      status VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
      pdf_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_invoices_purchase_order
        FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    );
  `);

  // Migrate old status values to GENERATED if necessary
  await pool.query(`
    UPDATE invoices
    SET status = 'GENERATED'
    WHERE status NOT IN ('GENERATED', 'SENT', 'PAID', 'CANCELLED');
  `);

  // Re-create check constraint
  await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;');
  await pool.query(`
    ALTER TABLE invoices
    ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('GENERATED', 'SENT', 'PAID', 'CANCELLED'));
  `);

  // Add UNIQUE constraint on purchase_order_id
  await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS uq_invoices_purchase_order;');
  await pool.query('ALTER TABLE invoices ADD CONSTRAINT uq_invoices_purchase_order UNIQUE (purchase_order_id);');

  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_purchase_order_id ON invoices (purchase_order_id);');
}

module.exports = {
  createInvoicesTable,
};
