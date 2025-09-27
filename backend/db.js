const { Pool } = require('pg');
require('dotenv').config();

// Check if the database URL is provided
if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not defined in the environment variables');
}

// Create a new pool instance.
// The pg library will automatically parse the connection string.
// It also automatically handles SSL for connections to services like NeonDB.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // In some environments, this might be necessary.
  }
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to the database', err.stack);
  } else {
    console.log('✅ Database connected successfully. Server time:', res.rows[0].now);
  }
});

// Export the query function to be used in other parts of the application
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export the pool itself for more complex transactions if needed
};
