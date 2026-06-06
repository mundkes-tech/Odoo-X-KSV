async function createInvoicesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(80) NOT NULL UNIQUE,
      purchase_order_id UUID NOT NULL,
      subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
      tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
      total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED')),
      pdf_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_invoices_purchase_order
        FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_purchase_order_id ON invoices (purchase_order_id);');
}

module.exports = {
  createInvoicesTable,
};
