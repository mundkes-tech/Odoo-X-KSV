const { Pool } = require('pg');
const logger = require('../utils/logger');
const { initializeModels } = require('../models');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL client error.', { error: error.message });
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS now;');
    logger.info('PostgreSQL connection test passed.', { dbTime: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('PostgreSQL connection test failed.', { error: error.message });
    throw error;
  }
}

async function initializeDatabase() {
  try {
    await initializeModels(pool);
    logger.info('Database initialization completed.');
  } catch (error) {
    logger.error('Database initialization failed.', { error: error.message });
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
};
