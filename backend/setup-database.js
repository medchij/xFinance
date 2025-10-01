require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

// Утга null эсвэл undefined бол default утга буцаана.
const withDefault = (value, defaultValue) => value === undefined || value === null ? defaultValue : value;

// Огноог уншиж, DB-д оруулах боломжтой ISO форматад шилжүүлнэ.
function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

// Өгөгдлийн сангийн тохиргоог тодорхойлох хэсэг
const ENTITIES = {
    permissions: { table: 'permissions', file: 'permissions.json' },
    roles: { table: 'roles', file: 'roles.json' },
    users: { table: 'users', file: 'users.json' },
    role_permissions: { table: 'role_permissions', file: 'role_permissions.json' },
    companies: { table: 'companies', file: 'companies.json' },
    Branch: { table: 'branches', file: 'Branch.json' },
    Currency: { table: 'currencies', file: 'Currency.json' },
    Customer: { table: 'customers', file: 'Customer.json' },
    GLCategory: { table: 'gl_categories', file: 'GLCategory.json' },
    GLAccount: { table: 'gl_accounts', file: 'GLAccount.json' },
    CF: { table: 'cf_items', file: 'CF.json' },
    Settings: { table: 'settings', file: 'Settings.json' },
    Account: { table: 'accounts', file: 'Account.json' },
};

// Гадаад түлхүүрийн хамаарлаас болж өгөгдлийг оруулах дараалал
const MIGRATION_ORDER = Object.keys(ENTITIES);

// Хүснэгт үүсгэх функц (Таны хуучин кодоор)
async function createTables(client) {
    console.log('Бүх хүснэгтийг устгаж, шинээр үүсгэж байна...');
    await client.sql`DROP TABLE IF EXISTS roles, settings, cf_items, gl_accounts, gl_categories, customers, currencies, branches, accounts, companies, role_permissions, user_roles, user_groups, permissions, "groups", users CASCADE;`;

    console.log('Админ хуудасны хүснэгтүүдийг үүсгэж байна...');
    await client.sql`CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, full_name VARCHAR(100), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;
    await client.sql`CREATE TABLE roles (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, description TEXT);`;
    await client.sql`CREATE TABLE permissions (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, description TEXT);`;
    await client.sql`CREATE TABLE role_permissions (role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE, permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY (role_id, permission_id));`;
    
    console.log('Үндсэн хүснэгтүүдийг үүсгэж байна...');
    await client.sql`CREATE TABLE companies (id VARCHAR(100) PRIMARY KEY, name VARCHAR(255) NOT NULL);`;
    await client.sql`CREATE TABLE accounts (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), account_number VARCHAR(255), account_name VARCHAR(255), currency VARCHAR(10), branch VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE branches (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), code VARCHAR(50), name VARCHAR(255), status VARCHAR(50), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE currencies (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), code VARCHAR(50), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE customers (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), status VARCHAR(50), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_categories (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_accounts (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), account_number VARCHAR(255), account_name VARCHAR(255), category_name VARCHAR(255), currency VARCHAR(50), counter INTEGER, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE cf_items (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), type VARCHAR(50), created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE settings (id SERIAL PRIMARY KEY, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), tab VARCHAR(100), name VARCHAR(255), value TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), UNIQUE(company_id, name));`;

    console.log('✅ Бүх хүснэгтүүд амжилттай үүсгэгдлээ.');
}

// Өгөгдөл шилжүүлэх нэгдсэн функц (Шинэчлэгдсэн)
async function migrateData(client, sourceDir, adminUserId, isCommonData = false) {
    console.log(`\n--- ${sourceDir} хавтасны өгөгдлийг шилжүүлж байна ---`);
    const now = new Date().toISOString();

    for (const entityName of MIGRATION_ORDER) {
        const entityInfo = ENTITIES[entityName];
        if (!entityInfo) continue;
        
        const { table, file } = entityInfo;
        const jsonPath = path.resolve(__dirname, sourceDir, file);

        try {
            const jsonContent = await fs.readFile(jsonPath, 'utf8');
            const records = JSON.parse(jsonContent);

            if (records.length === 0) continue;
            console.log(`  -> ${sourceDir}/${file}: ${records.length} бичлэг оллоо. ${table} хүснэгт рүү шилжүүлж байна...`);

            for (const record of records) {
                const createdAt = parseDate(record.create_date || record['Нээсэн огноо'] || record.creade_date || record.createdAt);
                const companyId = isCommonData ? null : sourceDir;

                try {
                    switch (table) {
                        // Common Data Cases
                        case 'users':
                            const passwordHash = await bcrypt.hash(record.password, 10);
                            await client.sql`INSERT INTO users (id, username, password_hash, email, full_name) VALUES (${record.id}, ${record.username}, ${passwordHash}, ${record.email}, ${record.full_name}) ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, password_hash=EXCLUDED.password_hash, email=EXCLUDED.email, full_name=EXCLUDED.full_name;`;
                            break;
                        case 'roles':
                            await client.sql`INSERT INTO roles (id, name, description) VALUES (${record.id}, ${record.name}, ${record.description}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`;
                            break;
                        case 'permissions':
                            await client.sql`INSERT INTO permissions (id, name, description) VALUES (${record.id}, ${record.name}, ${record.description}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`;
                            break;
                        case 'role_permissions':
                            await client.sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${record.role_id}, ${record.permission_id}) ON CONFLICT DO NOTHING;`;
                            break;
                        case 'companies':
                             await client.sql`INSERT INTO companies (id, name) VALUES (${record.id}, ${record.name}) ON CONFLICT (id) DO NOTHING;`;
                            break;

                        // Company-Specific Data Cases
                        case 'accounts':
                            await client.sql`INSERT INTO accounts (company_id, account_number, account_name, currency, branch, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Валют']}, ${record['Салбар']}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, account_number) DO NOTHING;`;
                            break;
                        case 'branches':
                            await client.sql`INSERT INTO branches (company_id, original_id, code, name, status, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record.code}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, code) DO NOTHING;`;
                            break;
                        case 'currencies':
                            await client.sql`INSERT INTO currencies (company_id, original_id, name, code, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record.name}, ${record.code}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, code) DO NOTHING;`;
                            break;
                        case 'customers':
                            await client.sql`INSERT INTO customers (company_id, original_id, name, status, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                            break;
                        case 'gl_categories':
                            await client.sql`INSERT INTO gl_categories (company_id, original_id, name, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record.name}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                            break;
                        case 'gl_accounts':
                            await client.sql`INSERT INTO gl_accounts (company_id, original_id, account_number, account_name, category_name, currency, counter, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Дансны ангилал']}, ${record['Валют']}, ${parseInt(record['Тоолуур'] || '0')}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, account_number) DO NOTHING;`;
                            break;
                        case 'cf_items':
                            const name = record.name || '';
                            const type = name.includes('(+)') ? 'Inflow' : (name.includes('(-)') ? 'Outflow' : 'Other');
                            const cleanedName = name.replace(/\s*\([+-]\)/, '').trim();
                            await client.sql`INSERT INTO cf_items (company_id, original_id, name, type, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${cleanedName}, ${type}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                            break;
                        case 'settings':
                            await client.sql`INSERT INTO settings (company_id, original_id, tab, name, value, created_at, updated_at, created_by, updated_by) VALUES (${companyId}, ${record.id}, ${record.tab}, ${record.name}, ${record.value}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                            break;
                    }
                } catch (dbError) {
                    console.error(`❌ DB INSERT ERROR [${sourceDir}/${file} -> ${table}]:`, dbError.message, 'Record:', JSON.stringify(record));
                }
            }
        } catch (fileError) {
            if (fileError.code !== 'ENOENT') {
                console.error(`❌ FILE READ ERROR [${sourceDir}/${file}]:`, fileError.message);
            }
        }
    }
}

// Үндсэн ажиллагааг удирдах функц
async function setup() {
    let client;
    try {
        client = await db.connect();
        console.log('--- Мэдээллийн Санг Бүрэн Шинэчлэх Ажиллагаа Эхэллээ ---');

        // 1. Хүснэгтүүдийг үүсгэх
        await createTables(client);

        // 2. Нийтлэг өгөгдлийг (users, roles, permissions) ./data хавтаснаас оруулах
        await migrateData(client, 'data', null, true);

        // Админ хэрэглэгчийн ID-г авах (username эсвэл email-ээр)
        const adminUserResult = await client.sql`SELECT id FROM users WHERE username = 'admin' OR email = 'admin@example.com' LIMIT 1;`;
        if (adminUserResult.rows.length === 0) {
            throw new Error('Админ хэрэглэгч ./data/users.json дотор тодорхойлогдоогүй байна.');
        }
        const adminUserId = adminUserResult.rows[0].id;
        console.log(`\n🔑 Админ хэрэглэгчийн ID: ${adminUserId}`);

        // 3. Компанийн тусгай өгөгдлүүдийг оруулах
        const backendDir = __dirname;
        const allDirents = await fs.readdir(backendDir, { withFileTypes: true });
        const companyDirs = allDirents
            .filter(d => d.isDirectory() && d.name.startsWith('data-'))
            .map(d => d.name);

        if (companyDirs.length > 0) {
            console.log(`\n🏢 Компани-специфик өгөгдлийг шилжүүлж байна: ${companyDirs.join(', ')}`);
            for (const dirName of companyDirs) {
                await migrateData(client, dirName, adminUserId, false);
            }
        } else {
            console.warn('⚠️ data- ээр эхэлсэн компани-специфик хавтас олдсонгүй.');
        }

        console.log('\n🎉🎉🎉 Ажиллагаа амжилттай дууслаа! 🎉🎉🎉');

    } catch (error) {
        console.error('❌❌❌ Скрипт ажиллахад ноцтой алдаа гарлаа:', error);
        process.exit(1);
    } finally {
        if (client) await client.release();
    }
}

// Скриптийг шууд ажиллуулах
setup();
