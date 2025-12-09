require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');

console.log('POSTGRES_URL:', process.env.POSTGRES_URL);

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

const COMPANY_ID = 'dataGI';

const ENTITIES = {
  Settings: { table: 'settings', file: 'Settings.json' },
};

async function populateDataGI() {
  const client = await db.connect();
  
  try {
    console.log(`\n--- dataGI компани өгөгдөл нэмэх эхэллээ ---`);
    
    // 1. Компани үүсгэх (хэрэв байхгүй бол)
    await client.sql`
      INSERT INTO companies (id, name)
      VALUES (${COMPANY_ID}, 'GI Company')
      ON CONFLICT (id) DO NOTHING;
    `;
    console.log(`✅ Компани '${COMPANY_ID}' бэлэн болсон.`);

    // 2. Admin хэрэглэгчийн ID авах (created_by/updated_by-д ашиглана)
    const adminResult = await client.sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1;`;
    const adminUserId = adminResult.rows[0]?.id || 1;
    const now = new Date().toISOString();

    // 3. dataGI/{file} файлуудыг уншиж өгөгдөл нэмэх
    for (const [entityName, { table, file }] of Object.entries(ENTITIES)) {
      console.log(`\n🔄 ${entityName} -> ${table} хүснэгтэд ${COMPANY_ID} өгөгдөл нэмж байна...`);
      
      const jsonPath = path.resolve(__dirname, '..', COMPANY_ID, file);
      
      try {
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        const records = JSON.parse(jsonContent);

        for (const record of records) {
          try {
            const createdAt = parseDate(record.create_date || record.creade_date || record.createdAt);

            switch (table) {
              case 'settings':
                await client.sql`
                  INSERT INTO settings (company_id, original_id, tab, name, value, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.tab}, ${record.name}, ${record.value}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, name) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at,
                    updated_by = EXCLUDED.updated_by;
                `;
                break;

              // Бусад хүснэгтүүдийг нэмэхийг хүсвэл энд case нэм:
              // case 'accounts':
              //   await client.sql`INSERT INTO accounts ... ON CONFLICT ... DO UPDATE ...`;
              //   break;
            }
          } catch (dbError) {
            console.error(`❌ DB INSERT ERROR [${COMPANY_ID}/${file} -> ${table}]:`, dbError.message, 'Record:', JSON.stringify(record));
          }
        }

        console.log(`✅ ${entityName}: ${records.length} бичлэг боловсруулагдлаа.`);
      } catch (fileError) {
        if (fileError.code === 'ENOENT') {
          console.warn(`⚠️ Файл олдсонгүй: ${jsonPath}`);
        } else {
          console.error(`❌ FILE READ ERROR [${COMPANY_ID}/${file}]:`, fileError.message);
        }
      }
    }

    console.log('\n✅ dataGI компани өгөгдөл амжилттай нэмэгдлээ!');
  } catch (error) {
    console.error('❌ Populate dataGI алдаа:', error);
    throw error;
  } finally {
    client.release();
  }
}

populateDataGI()
  .then(() => {
    console.log('✅ Script дууслаа.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script амжилтгүй:', err);
    process.exit(1);
  });
