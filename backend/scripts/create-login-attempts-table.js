const db = require('../db');

async function createLoginAttemptsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT FALSE
      );
      
      CREATE INDEX IF NOT EXISTS idx_username ON login_attempts(username);
      CREATE INDEX IF NOT EXISTS idx_attempt_time ON login_attempts(attempt_time);
    `);
    
    console.log('✅ login_attempts table created successfully');
  } catch (error) {
    console.error('❌ Error creating login_attempts table:', error);
    throw error;
  }
}

createLoginAttemptsTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
