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

// Компанийн ID болон утгыг өөрчлөх
const COMPANY_ID = 'dataAP'; // Өөрчлөх
const COMPANY_NAME = 'dataAP'; // Өөрчлөх

const ENTITIES = {
  Account: { table: 'accounts', file: 'Account.json' },
  Branch: { table: 'branches', file: 'Branch.json' },
  Currency: { table: 'currencies', file: 'Currency.json' },
  Customer: { table: 'customers', file: 'Customer.json' },
  GLCategory: { table: 'gl_categories', file: 'GLCategory.json' },
  GLAccount: { table: 'gl_accounts', file: 'GLAccount.json' },
  CF: { table: 'cf_items', file: 'CF.json' },
  Settings: { table: 'settings', file: 'Settings.json' },
};

async function addCompany() {
  const client = await db.connect();
  
  try {
    console.log(`\n--- ${COMPANY_ID} компани нэмэх эхэллээ ---`);
    
    // 1. Компани үүсгэх
    await client.sql`
      INSERT INTO companies (id, name)
      VALUES (${COMPANY_ID}, ${COMPANY_NAME})
      ON CONFLICT (id) DO NOTHING;
    `;
    console.log(`✅ Компани '${COMPANY_ID}' бүртгэгдсэн.`);

    // 2. Admin хэрэглэгчийн ID авах
    const adminResult = await client.sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1;`;
    const adminUserId = adminResult.rows[0]?.id || 1;
    const now = new Date().toISOString();

    // 3. backend/{COMPANY_ID}/ директорийн JSON файлуудыг уншиж өгөгдөл нэмэх
    for (const [entityName, { table, file }] of Object.entries(ENTITIES)) {
      console.log(`\n🔄 ${entityName} -> ${table} хүснэгтэд ${COMPANY_ID} өгөгдөл нэмж байна...`);
      
      const jsonPath = path.resolve(__dirname, '..', COMPANY_ID, file);
      
      try {
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        const records = JSON.parse(jsonContent);
        let insertCount = 0;

        for (const record of records) {
          try {
            const createdAt = parseDate(record.create_date || record.creade_date || record.createdAt || record['Нээсэн огноо']);

            switch (table) {
              case 'accounts':
                await client.sql`
                  INSERT INTO accounts (company_id, account_number, account_name, currency, branch, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Валют']}, ${record['Салбар']}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, account_number) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'branches':
                await client.sql`
                  INSERT INTO branches (company_id, original_id, code, name, status, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.code}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, code) DO UPDATE SET
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'currencies':
                await client.sql`
                  INSERT INTO currencies (company_id, original_id, name, code, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.name}, ${record.code}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, code) DO UPDATE SET
                    name = EXCLUDED.name,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'customers':
                await client.sql`
                  INSERT INTO customers (company_id, original_id, name, status, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, name) DO UPDATE SET
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'gl_categories':
                await client.sql`
                  INSERT INTO gl_categories (company_id, original_id, name, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.name}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, name) DO UPDATE SET
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'gl_accounts':
                await client.sql`
                  INSERT INTO gl_accounts (company_id, original_id, account_number, account_name, category_name, currency, counter, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Дансны ангилал']}, ${record['Валют']}, ${parseInt(record['Тоолуур'] || '0')}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, account_number) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    category_name = EXCLUDED.category_name,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'cf_items':
                const name = record.name || '';
                const code = record.code || '';
                const type = name.includes('(+)') ? 'Inflow' : (name.includes('(-)') ? 'Outflow' : 'Other');
                await client.sql`
                  INSERT INTO cf_items (company_id, original_id, code, name, type, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${code}, ${name}, ${type}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, code) DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;

              case 'settings':
                await client.sql`
                  INSERT INTO settings (company_id, original_id, tab, name, value, created_at, updated_at, created_by, updated_by)
                  VALUES (${COMPANY_ID}, ${record.id}, ${record.tab}, ${record.name}, ${record.value}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId})
                  ON CONFLICT (company_id, name) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at;
                `;
                insertCount++;
                break;
            }
          } catch (dbError) {
            console.error(`❌ DB INSERT ERROR [${COMPANY_ID}/${file} -> ${table}]:`, dbError.message);
          }
        }

        console.log(`✅ ${entityName}: ${insertCount}/${records.length} бичлэг нэмэгдлээ.`);
      } catch (fileError) {
        if (fileError.code === 'ENOENT') {
          console.warn(`⚠️ Файл олдсонгүй: ${jsonPath}`);
        } else {
          console.error(`❌ FILE READ ERROR [${COMPANY_ID}/${file}]:`, fileError.message);
        }
      }
    }

    console.log(`\n✅ ${COMPANY_ID} компани өгөгдөл амжилттай нэмэгдлээ!`);
  } catch (error) {
    console.error('❌ Add company алдаа:', error);
    throw error;
  } finally {
    client.release();
  }
}

addCompany()
  .then(() => {
    console.log('✅ Script дууслаа.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script амжилтгүй:', err);
    process.exit(1);
  });
