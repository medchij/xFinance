const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
const url = process.env.POSTGRES_URL;

if (url) {
  // Create a new pool instance when URL is provided
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  // Test the database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Error connecting to the database', err.stack);
    } else {
      console.log('✅ Database connected successfully. Server time:', res.rows[0].now);
    }
  });
} else {
  // Fallback for local/dev without DB
  console.warn('⚠️ POSTGRES_URL is not set. Backend will run WITHOUT database.');
}

// Export a safe query function
module.exports = {
  query: (text, params) => {
    if (!pool) {
      throw new Error('Database is not configured. Set POSTGRES_URL to enable DB queries.');
    }
    return pool.query(text, params);
  },
  pool,
};
