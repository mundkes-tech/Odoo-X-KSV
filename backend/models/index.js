const logger = require('../utils/logger');
const { createUsersTable } = require('./usersModel');
const { createVendorsTable } = require('./vendorsModel');
const { createRfqsTable } = require('./rfqsModel');
const { createRfqVendorsTable } = require('./rfqVendorsModel');
const { createQuotationsTable } = require('./quotationsModel');
const { createApprovalsTable } = require('./approvalsModel');
const { createPurchaseOrdersTable } = require('./purchaseOrdersModel');
const { createInvoicesTable } = require('./invoicesModel');
const { createActivityLogsTable } = require('./activityLogsModel');
const { createNotificationsTable } = require('./notificationsModel');

async function createUtilityFunctions(pool) {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

async function createUpdatedAtTriggers(pool) {
  const tablesWithUpdatedAt = ['users', 'vendors', 'rfqs', 'quotations'];

  for (const tableName of tablesWithUpdatedAt) {
    await pool.query(`DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName};`);
    await pool.query(`
      CREATE TRIGGER trg_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at_timestamp();
    `);
  }
}

async function initializeModels(pool) {
  const tableCreationSteps = [
    { name: 'users', run: createUsersTable },
    { name: 'vendors', run: createVendorsTable },
    { name: 'rfqs', run: createRfqsTable },
    { name: 'rfq_vendors', run: createRfqVendorsTable },
    { name: 'quotations', run: createQuotationsTable },
    { name: 'approvals', run: createApprovalsTable },
    { name: 'purchase_orders', run: createPurchaseOrdersTable },
    { name: 'invoices', run: createInvoicesTable },
    { name: 'activity_logs', run: createActivityLogsTable },
    { name: 'notifications', run: createNotificationsTable },
  ];

  logger.info('Initializing database schema...');

  await createUtilityFunctions(pool);

  for (const step of tableCreationSteps) {
    await step.run(pool);
    logger.info(`Table ready: ${step.name}`);
  }

  await createUpdatedAtTriggers(pool);
  logger.info('Database schema initialization completed successfully.');
}

module.exports = {
  initializeModels,
};
