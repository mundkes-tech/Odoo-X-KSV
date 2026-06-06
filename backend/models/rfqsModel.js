async function createRfqsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rfqs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
      deadline TIMESTAMPTZ NOT NULL,
      attachment_url TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_rfqs_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    );
  `);

  // Migrate any rows with statuses not in the new valid set before re-adding the constraint
  await pool.query(`
    UPDATE rfqs
    SET status = 'DRAFT'
    WHERE status NOT IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'VENDOR_SELECTED');
  `);

  await pool.query('ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS rfqs_status_check;');
  await pool.query(`
    ALTER TABLE rfqs
    ADD CONSTRAINT rfqs_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'VENDOR_SELECTED'));
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON rfqs (deadline);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_rfqs_created_by ON rfqs (created_by);');
}

module.exports = {
  createRfqsTable,
};
