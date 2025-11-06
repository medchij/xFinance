const db = require('../db');

async function createPasswordResetTokensTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ password_reset_tokens table created successfully');
  } catch (error) {
    console.error('❌ Error creating password_reset_tokens table:', error);
    throw error;
  }
}

createPasswordResetTokensTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
