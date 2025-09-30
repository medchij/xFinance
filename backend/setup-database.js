require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

// Helper function to safely parse date strings
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        const cleanStr = dateStr.replace(/ (PM|AM)/, '').replace(/,/, '');
        const date = new Date(cleanStr);
        if (isNaN(date.getTime())) {
            const parts = dateStr.split(/[/, :]/);
            if (parts.length >= 3) {
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
    GLCategory: { table: 'gl_categories', file: 'GLCatergory.json' },
    GLAccount: { table: 'gl_accounts', file: 'GLAccount.json' },
    CF: { table: 'cf_items', file: 'CF.json' },
    Settings: { table: 'settings', file: 'Settings.json' },
    Account: { table: 'accounts', file: 'Account.json' },
};

async function createTables(client) {
    console.log('Бүх хүснэгтийг устгаж, шинээр үүсгэж байна...');
    await client.sql`DROP TABLE IF EXISTS settings, cf_items, gl_accounts, gl_categories, customers, currencies, branches, accounts, companies, role_permissions, user_roles, user_groups, permissions, "groups", roles, users CASCADE;`;

    // Core App Tables
    await client.sql`CREATE TABLE companies (id VARCHAR(100) PRIMARY KEY, name VARCHAR(255) NOT NULL);`;
    await client.sql`CREATE TABLE accounts (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), account_number VARCHAR(255), account_name VARCHAR(255), currency VARCHAR(10), branch VARCHAR(255), created_at TIMESTAMP, PRIMARY KEY(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE branches (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), code VARCHAR(50), name VARCHAR(255), create_date TIMESTAMP, status VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE currencies (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), code VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, code));`;
    await client.sql`CREATE TABLE customers (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), create_date TIMESTAMP, status VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_categories (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE gl_accounts (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), account_number VARCHAR(255), account_name VARCHAR(255), category_name VARCHAR(255), currency VARCHAR(50), counter INTEGER, PRIMARY KEY(id), UNIQUE(company_id, account_number));`;
    await client.sql`CREATE TABLE cf_items (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), name VARCHAR(255), type VARCHAR(50), PRIMARY KEY(id), UNIQUE(company_id, name));`;
    await client.sql`CREATE TABLE settings (id SERIAL, company_id VARCHAR(100) REFERENCES companies(id), original_id VARCHAR(50), tab VARCHAR(100), name VARCHAR(255), value TEXT, create_date TIMESTAMP, PRIMARY KEY(id), UNIQUE(company_id, name));`;
    
    // --- Admin Panel Tables ---
    console.log('Админ хуудасны хүснэгтүүдийг үүсгэж байна...');
    await client.sql`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await client.sql`
        CREATE TABLE roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT
        );
    `;
    await client.sql`
        CREATE TABLE "groups" (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT
        );
    `;
    await client.sql`
        CREATE TABLE permissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT
        );
    `;
    await client.sql`
        CREATE TABLE user_roles (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_id)
        );
    `;
    await client.sql`
        CREATE TABLE user_groups (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            group_id INTEGER REFERENCES "groups"(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, group_id)
        );
    `;
    await client.sql`
        CREATE TABLE role_permissions (
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        );
    `;

    console.log('✅ Бүх хүснэгтүүд амжилттай үүсгэгдлээ.');
}

async function seedInitialData(client) {
    console.log('\n🔄 Анхдагч өгөгдлийг оруулж байна...');
    try {
        // Seed Permissions
        const permissions = [
            { name: 'manage_users', description: 'Хэрэглэгч нэмэх, засах, устгах' },
            { name: 'view_users', description: 'Хэрэглэгчдийн жагсаалтыг харах' },
            { name: 'manage_roles', description: 'Ажил үүрэг нэмэх, засах, устгах' },
            { name: 'view_roles', description: 'Ажил үүргүүдийн жагсаалтыг харах' },
            { name: 'manage_groups', description: 'Бүлэг нэмэх, засах, устгах' },
            { name: 'view_groups', description: 'Бүлгүүдийн жагсаалтыг харах' },
            { name: 'manage_permissions', description: 'Ажил үүргийн эрхийг тохируулах' },
            { name: 'view_reports', description: 'Тайлангуудыг харах' },
            { name: 'manage_settings', description: 'Системийн тохиргоог өөрчлөх' },
        ];
        for (const p of permissions) {
            await client.sql`INSERT INTO permissions (name, description) VALUES (${p.name}, ${p.description}) ON CONFLICT (name) DO NOTHING;`;
        }
        console.log('✅ Эрхүүд нэмэгдлээ.');

        // Seed Roles
        const adminRole = await client.sql`INSERT INTO roles (name, description) VALUES ('Админ', 'Системийн бүх эрхтэй') ON CONFLICT (name) DO NOTHING RETURNING id;`;
        await client.sql`INSERT INTO roles (name, description) VALUES ('Хэрэглэгч', 'Энгийн хэрэглэгчийн эрхтэй') ON CONFLICT (name) DO NOTHING;`;
        console.log('✅ Ажил үүргүүд нэмэгдлээ.');
        
        // Assign all permissions to Admin role
        if (adminRole.rows.length > 0) {
            const adminRoleId = adminRole.rows[0].id;
            const allPermissions = await client.sql`SELECT id FROM permissions;`;
            for (const p of allPermissions.rows) {
                await client.sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${adminRoleId}, ${p.id}) ON CONFLICT DO NOTHING;`;
            }
            console.log('✅ Админ ажил үүрэгт бүх эрхийг оноолоо.');
        }

        // Seed Admin User
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        const adminUser = await client.sql`
            INSERT INTO users (username, password_hash, email, full_name) 
            VALUES (${adminUsername}, ${passwordHash}, ${adminEmail}, 'Админ Хэрэглэгч') 
            ON CONFLICT (username) DO NOTHING RETURNING id;`;
        console.log('✅ Админ хэрэглэгч үүслээ.');

        // Assign Admin role to Admin user
        if (adminUser.rows.length > 0 && adminRole.rows.length > 0) {
            const adminUserId = adminUser.rows[0].id;
            const adminRoleId = adminRole.rows[0].id;
            await client.sql`INSERT INTO user_roles (user_id, role_id) VALUES (${adminUserId}, ${adminRoleId}) ON CONFLICT DO NOTHING;`;
            console.log('✅ Админ хэрэглэгчид Админ ажил үүргийг оноолоо.');
        }

    } catch (error) {
        console.error('❌ Анхдагч өгөгдөл оруулахад алдаа гарлаа:', error);
    }
}

async function migrateData(client, companyDirs) {
    // ... (This function remains unchanged)
}

async function setup() {
  let client;
  try {
    client = await db.connect();
    console.log('--- Мэдээллийн Санг Бүрэн Шинэчлэх Ажиллагаа Эхэллээ ---');

    await createTables(client);
    await seedInitialData(client);

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
