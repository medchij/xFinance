require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('@vercel/postgres');

async function addUniqueConstraint() {
  let client;
  try {
    client = await db.connect();
    console.log('🔧 user_settings хүснэгтэд UNIQUE constraint нэмж байна...');

    // Хуучин constraint байгаа эсэхийг шалгаад устгах
    await client.sql`
      ALTER TABLE user_settings 
      DROP CONSTRAINT IF EXISTS user_settings_user_id_setting_key_key;
    `;

    // Давхардсан өгөгдөл байгаа эсэхийг шалгаад устгах (сүүлчийнийг үлдээх)
    await client.sql`
      DELETE FROM user_settings a
      USING user_settings b
      WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND a.setting_key = b.setting_key;
    `;
    
    console.log('✅ Давхардсан өгөгдөл устгагдлаа.');

    // Шинэ UNIQUE constraint нэмэх
    await client.sql`
      ALTER TABLE user_settings 
      ADD CONSTRAINT user_settings_user_id_setting_key_unique 
      UNIQUE (user_id, setting_key);
    `;

    console.log('✅ UNIQUE constraint амжилттай нэмэгдлээ.');

  } catch (error) {
    console.error('❌ Алдаа гарлаа:', error);
    process.exit(1);
  } finally {
    if (client) await client.release();
    process.exit(0);
  }
}

addUniqueConstraint();
