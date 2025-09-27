require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');

// Helper function to safely parse date strings
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Handles formats like "2025-03-25 1:14:17 PM" or "DD/MM/YYYY, HH:MM:SS"
        const cleanStr = dateStr.replace(/ (PM|AM)/, '').replace(/,/, '');
        const date = new Date(cleanStr);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            // Try another common format: DD/MM/YYYY
            const parts = dateStr.split(/[/, :]/);
            if (parts.length >= 3) {
                // Assuming DD/MM/YYYY
                const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(d.getTime())) return d.toISOString();
            }
            return null;
        }
        return date.toISOString();
    } catch (e) {
        return null;
    }
}


const ENTITIES = {
    Branch: { table: 'branches', file: 'Branch.json' },
    Currency: { table: 'currencies', file: 'Currency.json' },
    Customer: { table: 'customers', file: 'Customer.json' },
    GLCategory: { table: 'gl_categories', file: 'GLCatergory.json' }, // Note the typo in filename
    GLAccount: { table: 'gl_accounts', file: 'GLAccount.json' },
    CF: { table: 'cf_items', file: 'CF.json' },
    Settings: { table: 'settings', file: 'Settings.json' },
    Account: { table: 'accounts', file: 'Account.json' },
};

async function createTables(client) {
    console.log('Бүх хүснэгтийг устгаж, шинээр үүсгэж байна...');
    await client.sql`DROP TABLE IF EXISTS settings, cf_items, gl_accounts, gl_categories, customers, currencies, branches, accounts, companies CASCADE;`;

    await client.sql`CREATE TABLE companies (id VARCHAR(100) PRIMARY KEY, name VARCHAR(255) NOT NULL);`;
    await client.sql`CREATE TABLE accounts (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), account_number VARCHAR(255), account_name VARCHAR(255), currency VARCHAR(10), branch VARCHAR(255), created_at TIMESTAMP, PRIMARY KEY(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE branches (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), code VARCHAR(50), name VARCHAR(255), create_date TIMESTAMP, status VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE currencies (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), code VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE customers (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), create_date TIMESTAMP, status VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_categories (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_accounts (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), account_number VARCHAR(255), account_name VARCHAR(255), category_name VARCHAR(255), currency VARCHAR(50), counter INTEGER, PRIMARY KEY(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE cf_items (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), type VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE settings (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), tab VARCHAR(100), name VARCHAR(255), value TEXT, create_date TIMESTAMP, PRIMARY KEY(id), UNIQUE(company_id, name));`;
    
    console.log('✅ Бүх хүснэгтүүд амжилттай үүсгэгдлээ.');
}

async function migrateData(client, companyDirs) {
    let totalCounts = {};
    console.log('\n--- Өгөгдөл Шилжүүлэлт Эхэллээ ---');

    for (const [entityName, { table, file }] of Object.entries(ENTITIES)) {
        totalCounts[table] = 0;
        console.log(`\n🔄 ${table} хүснэгтийн өгөгдлийг шилжүүлж байна...`);
        for (const dirName of companyDirs) {
            const jsonPath = path.resolve(__dirname, dirName, file);
            try {
                const jsonContent = await fs.readFile(jsonPath, 'utf8');
                const records = JSON.parse(jsonContent);

                for (const record of records) {
                    let result;
                    try {
                        // Pre-process values before inserting
                        const createdAt = parseDate(record.create_date || record['Нээсэн огноо'] || record.creade_date);

                        switch (table) {
                            case 'accounts': 
                                result = await client.sql`INSERT INTO accounts (company_id, account_number, account_name, currency, branch, created_at) VALUES (${dirName}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Валют']}, ${record['Салбар']}, ${createdAt}) ON CONFLICT (company_id, account_number) DO NOTHING;`; 
                                break;
                            case 'branches': 
                                result = await client.sql`INSERT INTO branches (company_id, original_id, code, name, create_date, status) VALUES (${dirName}, ${record.id}, ${record.code}, ${record.name}, ${createdAt}, ${record.status}) ON CONFLICT (company_id, code) DO NOTHING;`; 
                                break;
                            case 'currencies': 
                                result = await client.sql`INSERT INTO currencies (company_id, original_id, name, code) VALUES (${dirName}, ${record.id}, ${record.name}, ${record.code}) ON CONFLICT (company_id, code) DO NOTHING;`; 
                                break;
                            case 'customers': 
                                result = await client.sql`INSERT INTO customers (company_id, original_id, name, create_date, status) VALUES (${dirName}, ${record.id}, ${record.name}, ${createdAt}, ${record.status}) ON CONFLICT (company_id, name) DO NOTHING;`; 
                                break;
                            case 'gl_categories': 
                                result = await client.sql`INSERT INTO gl_categories (company_id, original_id, name) VALUES (${dirName}, ${record.id}, ${record.name}) ON CONFLICT (company_id, name) DO NOTHING;`; 
                                break;
                            case 'gl_accounts': 
                                result = await client.sql`INSERT INTO gl_accounts (company_id, original_id, account_number, account_name, category_name, currency, counter) VALUES (${dirName}, ${record.id}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Дансны ангилал']}, ${record['Валют']}, ${parseInt(record['Тоолуур'] || '0')}) ON CONFLICT (company_id, account_number) DO NOTHING;`; 
                                break;
                            case 'cf_items': 
                                result = await client.sql`INSERT INTO cf_items (company_id, original_id, name, type) VALUES (${dirName}, ${record.id}, ${record.name}, ${record.type}) ON CONFLICT (company_id, name) DO NOTHING;`; 
                                break;
                            case 'settings': 
                                result = await client.sql`INSERT INTO settings (company_id, original_id, tab, name, value, create_date) VALUES (${dirName}, ${record.id}, ${record.tab}, ${record.name}, ${record.value}, ${createdAt}) ON CONFLICT (company_id, name) DO NOTHING;`; 
                                break;
                        }
                        if (result && result.rowCount > 0) totalCounts[table]++;
                    } catch (dbError) {
                        console.error(`❌ DB INSERT ERROR [${dirName}/${file} -> ${table}]:`, dbError.message);
                        console.error('   -> Record:', JSON.stringify(record));
                    }
                }
            } catch (fileError) {
                if (fileError.code !== 'ENOENT') console.error(`❌ FILE READ ERROR [${dirName}/${file}]:`, fileError.message);
            }
        }
        console.log(`✅ ${table}: Нийт ${totalCounts[table]} бичлэг нэмэгдлээ.`);
    }
    console.log('\n--- Өгөгдөл Шилжүүлэлт Дууслаа ---');
}

async function setup() {
  let client;
  try {
    client = await db.connect();
    console.log('--- Мэдээллийн Санг Бүрэн Шинэчлэх Ажиллагаа Эхэллээ ---');

    await createTables(client);

    const backendDir = __dirname;
    const allDirents = await fs.readdir(backendDir, { withFileTypes: true });
    const companyDirs = allDirents
      .filter(d => d.isDirectory() && d.name.startsWith('data'))
      .map(d => d.name);

    if (companyDirs.length > 0) {
        console.log(`\n🏢 Компаниудыг бүртгэж байна: ${companyDirs.join(', ')}`);
        for(const dirName of companyDirs) {
            await client.sql`INSERT INTO companies (id, name) VALUES (${dirName}, ${dirName}) ON CONFLICT (id) DO NOTHING;`;
        }
        await migrateData(client, companyDirs);
    } else {
        console.warn('⚠️ data-аар эхэлсэн фолдер олдсонгүй.');
    }

    console.log('\n🎉🎉🎉 Ажиллагаа амжилттай дууслаа! 🎉🎉🎉');

  } catch (error) {
    console.error('❌❌❌ Скрипт ажиллахад ноцтой алдаа гарлаа:', error);
    process.exit(1);
  } finally {
    if(client) await client.release();
  }
}

setup();
