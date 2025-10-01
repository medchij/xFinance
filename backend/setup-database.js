require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

const ENTITIES = {
    Branch: { table: 'branches', file: 'Branch.json' },
    Currency: { table: 'currencies', file: 'Currency.json' },
    Customer: { table: 'customers', file: 'Customer.json' },
    GLCategory: { table: 'gl_categories', file: 'GLCategory.json' },
    GLAccount: { table: 'gl_accounts', file: 'GLAccount.json' },
    CF: { table: 'cf_items', file: 'CF.json' },
    Settings: { table: 'settings', file: 'Settings.json' },
    Account: { table: 'accounts', file: 'Account.json' },
};

async function createTables(client) {
    console.log('Бүх хүснэгтийг устгаж, шинээр үүсгэж байна...');
    await client.sql`DROP TABLE IF EXISTS roles, settings, cf_items, gl_accounts, gl_categories, customers, currencies, branches, accounts, companies, role_permissions, user_roles, user_groups, permissions, "groups", users CASCADE;`;

    console.log('Админ хуудасны хүснэгтүүдийг үүсгэж байна...');
    await client.sql`CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, full_name VARCHAR(100), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;
    await client.sql`CREATE TABLE roles (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, description TEXT);`;
    await client.sql`CREATE TABLE "groups" (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, description TEXT);`;
    await client.sql`CREATE TABLE permissions (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, description TEXT);`;
    await client.sql`CREATE TABLE user_roles (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (user_id, role_id));`;
    await client.sql`CREATE TABLE user_groups (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, group_id INTEGER REFERENCES "groups"(id) ON DELETE CASCADE, PRIMARY KEY (user_id, group_id));`;
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

async function seedInitialData(client) {
    console.log('\n🔄 Анхдагч өгөгдлийг оруулж байна...');
    let adminUserId;
    try {
        const permissions = [
            { name: 'manage_users', description: 'Хэрэглэгч нэмэх, засах, устгах' },
            { name: 'view_users', description: 'Хэрэглэгчдийн жагсаалтыг харах' },
            { name: 'manage_roles', description: 'Ажил үүрэг нэмэх, засах, устгах' },
            { name: 'view_roles', description: 'Ажил үүргүүдийн жагсаалтыг харах' },
        ];
        for (const p of permissions) {
            await client.sql`INSERT INTO permissions (name, description) VALUES (${p.name}, ${p.description}) ON CONFLICT (name) DO NOTHING;`;
        }
        console.log('✅ Эрхүүд нэмэгдлээ.');

        const adminRoleResult = await client.sql`INSERT INTO roles (name, description) VALUES ('Админ', 'Системийн бүх эрхтэй') ON CONFLICT (name) DO UPDATE SET description = 'Системийн бүх эрхтэй' RETURNING id;`;
        console.log('✅ Ажил үүргүүд нэмэгдлээ.');
        
        const adminRoleId = adminRoleResult.rows[0].id;
        const allPermissions = await client.sql`SELECT id FROM permissions;`;
        for (const p of allPermissions.rows) {
            await client.sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${adminRoleId}, ${p.id}) ON CONFLICT DO NOTHING;`;
        }
        console.log('✅ Админ ажил үүрэгт бүх эрхийг оноолоо.');

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        const adminUserResult = await client.sql`INSERT INTO users (username, password_hash, email, full_name) VALUES (${adminUsername}, ${passwordHash}, ${adminEmail}, 'Админ Хэрэглэгч') ON CONFLICT (username) DO UPDATE SET password_hash = ${passwordHash} RETURNING id;`;
        adminUserId = adminUserResult.rows[0].id;
        console.log(`✅ Админ хэрэглэгч үүслээ (ID: ${adminUserId}).`);

        await client.sql`INSERT INTO user_roles (user_id, role_id) VALUES (${adminUserId}, ${adminRoleId}) ON CONFLICT DO NOTHING;`;
        console.log('✅ Админ хэрэглэгчид Админ ажил үүргийг оноолоо.');

    } catch (error) {
        console.error('❌ Анхдагч өгөгдөл оруулахад алдаа гарлаа:', error);
        throw error;
    }
    return adminUserId;
}

async function migrateData(client, companyDirs, adminUserId) {
    console.log('\n--- Өгөгдөл Шилжүүлэлт Эхэллээ ---');
    if (!adminUserId) {
        console.error('❌ migrateData: Admin User ID олдсонгүй! Өгөгдөл шилжүүлэлтийг зогсоолоо.');
        return;
    }

    const now = new Date().toISOString();

    for (const [entityName, { table, file }] of Object.entries(ENTITIES)) {
        console.log(`\n🔄 ${entityName} -> ${table} хүснэгтийн өгөгдлийг шилжүүлж байна...`);
        for (const dirName of companyDirs) {
            const jsonPath = path.resolve(__dirname, dirName, file);
            try {
                const jsonContent = await fs.readFile(jsonPath, 'utf8');
                const records = JSON.parse(jsonContent);

                for (const record of records) {
                    try {
                        const createdAt = parseDate(record.create_date || record['Нээсэн огноо'] || record.creade_date || record.createdAt);

                        switch (table) {
                            case 'accounts':
                                await client.sql`INSERT INTO accounts (company_id, account_number, account_name, currency, branch, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Валют']}, ${record['Салбар']}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, account_number) DO NOTHING;`;
                                break;
                            case 'branches':
                                await client.sql`INSERT INTO branches (company_id, original_id, code, name, status, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record.code}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, code) DO NOTHING;`;
                                break;
                            case 'currencies':
                                await client.sql`INSERT INTO currencies (company_id, original_id, name, code, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record.name}, ${record.code}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, code) DO NOTHING;`;
                                break;
                            case 'customers':
                                await client.sql`INSERT INTO customers (company_id, original_id, name, status, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record.name}, ${record.status}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                                break;
                            case 'gl_categories':
                                await client.sql`INSERT INTO gl_categories (company_id, original_id, name, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record.name}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                                break;
                            case 'gl_accounts':
                                await client.sql`INSERT INTO gl_accounts (company_id, original_id, account_number, account_name, category_name, currency, counter, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record['Дансны дугаар']}, ${record['Дансны нэр']}, ${record['Дансны ангилал']}, ${record['Валют']}, ${parseInt(record['Тоолуур'] || '0')}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, account_number) DO NOTHING;`;
                                break;
                            case 'cf_items':
                                const name = record.name || '';
                                const type = name.includes('(+)') ? 'Inflow' : (name.includes('(-)') ? 'Outflow' : 'Other');
                                const cleanedName = name.replace(/\s*\([+-]\)/, '').trim();
                                await client.sql`INSERT INTO cf_items (company_id, original_id, name, type, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${cleanedName}, ${type}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                                break;
                            case 'settings':
                                await client.sql`INSERT INTO settings (company_id, original_id, tab, name, value, created_at, updated_at, created_by, updated_by) VALUES (${dirName}, ${record.id}, ${record.tab}, ${record.name}, ${record.value}, ${createdAt}, ${now}, ${adminUserId}, ${adminUserId}) ON CONFLICT (company_id, name) DO NOTHING;`;
                                break;
                        }
                    } catch (dbError) {
                        console.error(`❌ DB INSERT ERROR [${dirName}/${file} -> ${table}]:`, dbError.message, 'Record:', JSON.stringify(record));
                    }
                }
            } catch (fileError) {
                if (fileError.code !== 'ENOENT') {
                    console.error(`❌ FILE READ ERROR [${dirName}/${file}]:`, fileError.message);
                }
            }
        }
    }
}

async function setup() {
    let client;
    try {
        client = await db.connect();
        console.log('--- Мэдээллийн Санг Бүрэн Шинэчлэх Ажиллагаа Эхэллээ ---');

        await createTables(client);
        const adminUserId = await seedInitialData(client);

        const backendDir = __dirname;
        const allDirents = await fs.readdir(backendDir, { withFileTypes: true });
        const companyDirs = allDirents
            .filter(d => d.isDirectory() && d.name.startsWith('data'))
            .map(d => d.name);

        if (companyDirs.length > 0) {
            console.log(`\n🏢 Компаниудыг бүртгэж байна: ${companyDirs.join(', ')}`);
            for (const dirName of companyDirs) {
                await client.sql`INSERT INTO companies (id, name) VALUES (${dirName}, ${dirName}) ON CONFLICT (id) DO NOTHING;`;
            }
            await migrateData(client, companyDirs, adminUserId);
        } else {
            console.warn('⚠️ data-аар эхэлсэн фолдер олдсонгүй.');
        }

        console.log('\n🎉🎉🎉 Ажиллагаа амжилттай дууслаа! 🎉🎉🎉');

    } catch (error) {
        console.error('❌❌❌ Скрипт ажиллахад ноцтой алдаа гарлаа:', error);
        process.exit(1);
    } finally {
        if (client) await client.release();
    }
}

setup();
