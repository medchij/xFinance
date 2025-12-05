require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('@vercel/postgres');

async function createUserSettingsTable() {
  let client;
  try {
    client = await db.connect();
    console.log('🔧 User settings хүснэгт үүсгэж байна...');

    // User settings хүснэгт үүсгэх (компаниас хамаарахгүй)
    await client.sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, setting_key)
      );
    `;

    console.log('✅ user_settings хүснэгт амжилттай үүсгэгдлээ.');

    // Индекс үүсгэх (хурдасгах)
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user 
      ON user_settings(user_id);
    `;
    
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_key 
      ON user_settings(user_id, setting_key);
    `;

    console.log('✅ Индекс амжилттай үүсгэгдлээ.');

  } catch (error) {
    console.error('❌ Алдаа гарлаа:', error);
    process.exit(1);
  } finally {
    if (client) await client.release();
  }
}

createUserSettingsTable();
