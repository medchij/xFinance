const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { query } = require('../db');

(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(100),
        role_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

    console.log('✅ users хүснэгт шалгагдаж/үүсгэгдлээ.');
    process.exit(0);
  } catch (e) {
    console.error('❌ users хүснэгт үүсгэхэд алдаа:', e);
    process.exit(1);
  }
})();
