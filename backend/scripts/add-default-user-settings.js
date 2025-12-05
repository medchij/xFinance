require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('@vercel/postgres');

async function addDefaultUserSettings() {
  let client;
  try {
    client = await db.connect();
    console.log('🔧 Анхдагч тохиргоонууд нэмж байна...');

    // Admin хэрэглэгчийн ID (эсвэл өөр хэрэглэгч)
    const userId = 1; // admin

    const defaultSettings = [
      { key: 'language', value: 'mn' },
      { key: 'currency', value: 'MNT' },
      { key: 'dateFormat', value: 'YYYY-MM-DD' },
      { key: 'theme', value: 'light' },
      { key: 'emailNotifications', value: 'true' },
      { key: 'autoSync', value: 'true' },
      { key: 'sessionTimeout', value: '30' },
    ];

    for (const setting of defaultSettings) {
      // Эхлээд шалгах
      const checkResult = await client.sql`
        SELECT id FROM user_settings 
        WHERE user_id = ${userId} AND setting_key = ${setting.key};
      `;

      if (checkResult.rows.length > 0) {
        // Шинэчлэх
        await client.sql`
          UPDATE user_settings 
          SET setting_value = ${setting.value}, updated_at = NOW()
          WHERE user_id = ${userId} AND setting_key = ${setting.key};
        `;
        console.log(`🔄 ${setting.key} = ${setting.value} (шинэчлэгдсэн)`);
      } else {
        // Нэмэх
        await client.sql`
          INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
          VALUES (${userId}, ${setting.key}, ${setting.value}, NOW(), NOW());
        `;
        console.log(`✅ ${setting.key} = ${setting.value} (нэмэгдсэн)`);
      }
    }

    console.log('\n✅ Анхдагч тохиргоонууд амжилттай нэмэгдлээ!');

  } catch (error) {
    console.error('❌ Алдаа гарлаа:', error);
    process.exit(1);
  } finally {
    if (client) await client.release();
  }
}

addDefaultUserSettings();
