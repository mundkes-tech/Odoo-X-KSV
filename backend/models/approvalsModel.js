async function createApprovalsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_id UUID NOT NULL,
      manager_id UUID NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      remarks TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_approvals_quotation
        FOREIGN KEY (quotation_id)
        REFERENCES quotations (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_approvals_manager
        FOREIGN KEY (manager_id)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
      CONSTRAINT uq_approvals_quotation_manager UNIQUE (quotation_id, manager_id)
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals (status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_approvals_quotation_id ON approvals (quotation_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_approvals_manager_id ON approvals (manager_id);');
}

module.exports = {
  createApprovalsTable,
};
