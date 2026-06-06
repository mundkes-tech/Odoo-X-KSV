async function createNotificationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);');
}

module.exports = {
  createNotificationsTable,
};
