const { Pool } = require('pg');

const passwords = ['Mundke@22', 'postgres', 'admin', 'root', '', '123456', 'password'];

async function check() {
  for (const pw of passwords) {
    console.log(`Testing password: "${pw}"`);
    const pool = new Pool({
      connectionString: `postgresql://postgres:${encodeURIComponent(pw)}@localhost:5432/vendorbridge_db`
    });
    try {
      const res = await pool.query('SELECT 1 AS ok');
      console.log(`\n>>> SUCCESS! Password is "${pw}" <<<\n`);
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed: ${err.message}`);
      await pool.end();
    }
  }
  
  // Try default database "postgres" instead of "vendorbridge_db"
  for (const pw of passwords) {
    console.log(`Testing password against default DB "postgres": "${pw}"`);
    const pool = new Pool({
      connectionString: `postgresql://postgres:${encodeURIComponent(pw)}@localhost:5432/postgres`
    });
    try {
      const res = await pool.query('SELECT 1 AS ok');
      console.log(`\n>>> SUCCESS (postgres DB)! Password is "${pw}" <<<\n`);
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed: ${err.message}`);
      await pool.end();
    }
  }
  console.log('All passwords failed.');
  process.exit(1);
}

check();
