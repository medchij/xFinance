const { Pool } = require('pg');

// Vercel environment variables are automatically available.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

/**
 * A utility function to query the database. It handles acquiring a client from the pool,
 * executing the query, and releasing the client back to the pool.
 * This helps prevent connection leaks and manages the pool efficiently in a serverless environment.
 *
 * @param {string} text The SQL query string.
 * @param {Array} params The parameters to pass to the SQL query.
 * @returns {Promise<QueryResult>} The result of the query.
 */
const query = async (text, params) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database Query Error:', error);
    // Re-throw the error to be handled by the caller
    throw new Error('Database operation failed.', { cause: error });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = { query };
