async function createActivityLogsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs (entity_type, entity_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs (entity_type);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at);');
}

module.exports = {
  createActivityLogsTable,
};
