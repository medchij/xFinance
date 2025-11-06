// backend/Setup_database.js
//require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { db } = require('@vercel/postgres');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

const ROOT_DIR = path.resolve(__dirname, './globaldata');
const readJson = async (fname) => JSON.parse(await fs.readFile(path.join(ROOT_DIR, fname), 'utf8'));

async function ensureTables(client) {
    await client.sql`DROP TABLE IF EXISTS roles, role_permissions, user_roles, permissions, users CASCADE;`;
 
  await client.sql`
    CREATE TABLE IF NOT EXISTS roles(
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT
    );`;
    await client.sql`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(100),
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS permissions(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS role_permissions(
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS user_roles(
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );`;
}

async function importPermissions(client) {
  try {
    const rows = await readJson('permissions.json');
    let count = 0;
    for (const p of rows) {
      if (!p?.name) continue;
      if (p.id != null) {
        // id-тай оруулах
        await client.sql`
          INSERT INTO permissions(id, name, description)
          VALUES (${p.id}, ${p.name}, ${p.description || null})
          ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                description = COALESCE(EXCLUDED.description, permissions.description);`;
      } else {
        await client.sql`
          INSERT INTO permissions(name, description)
          VALUES (${p.name}, ${p.description || null})
          ON CONFLICT (name) DO UPDATE
            SET description = COALESCE(EXCLUDED.description, permissions.description);`;
      }
      count++;
    }
    // sequence-ийг max(id)-тэй тааруулах
    await client.sql`SELECT setval(pg_get_serial_sequence('permissions','id'),
                     COALESCE((SELECT MAX(id) FROM permissions), 1), true);`;
    console.log(`✅ permissions: ${count}`);
  } catch (e) {
    if (e.code === 'ENOENT') console.warn('⚠️ permissions.json not found. Skipped.');
    else throw e;
  }
}

async function importRoles(client) {
  try {
    const rows = await readJson('roles.json');
    let count = 0;
    for (const r of rows) {
      const name = r.name || r.role || r.title;
      if (!name) continue;
      if (r.id != null) {
        await client.sql`
          INSERT INTO roles(id, name, description)
          VALUES (${r.id}, ${name}, ${r.description || null})
          ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                description = COALESCE(EXCLUDED.description, roles.description);`;
      } else {
        await client.sql`
          INSERT INTO roles(name, description)
          VALUES (${name}, ${r.description || null})
          ON CONFLICT (name) DO UPDATE
            SET description = COALESCE(EXCLUDED.description, roles.description);`;
      }
      count++;
    }
    await client.sql`SELECT setval(pg_get_serial_sequence('roles','id'),
                     COALESCE((SELECT MAX(id) FROM roles), 1), true);`;
    console.log(`✅ roles: ${count}`);
  } catch (e) {
    if (e.code === 'ENOENT') console.warn('⚠️ roles.json not found. Skipped.');
    else throw e;
  }
}

async function importUsers(client) {
  try {
    const rows = await readJson('users.json');
    let count = 0;
    for (const u of rows) {
      const username = u.username || u.user || u.login;
      const email = u.email || null;
      const full_name = u.full_name || u.fullName || null;
      if (!username || !email) continue;

      let hash = u.password_hash || u.passwordHash || null;
      if (!hash && u.password) hash = await bcrypt.hash(String(u.password), 10);
      if (!hash) { console.warn(`⚠️ users: "${username}" missing password → skip`); continue; }

      if (u.id != null) {
        await client.sql`
          INSERT INTO users(id, username, password_hash, email, full_name, role_id)
          VALUES (${u.id}, ${username}, ${hash}, ${email}, ${full_name}, ${u.role_id})
          ON CONFLICT (id) DO UPDATE
            SET username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash,
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, users.full_name),
                role_id = COALESCE(EXCLUDED.role_id, users.role_id);`;
      } else {
        await client.sql`
          INSERT INTO users(username, password_hash, email, full_name, role_id)
          VALUES (${username}, ${hash}, ${email}, ${full_name}, ${u.role_id})
          ON CONFLICT (username) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                email = COALESCE(EXCLUDED.email, users.email),
                full_name = COALESCE(EXCLUDED.full_name, users.full_name),
                role_id = COALESCE(EXCLUDED.role_id, users.role_id);`;
      }
      count++;
    }
    await client.sql`SELECT setval(pg_get_serial_sequence('users','id'),
                     COALESCE((SELECT MAX(id) FROM users), 1), true);`;
    console.log(`✅ users: ${count}`);
  } catch (e) {
    if (e.code === 'ENOENT') console.warn('⚠️ users.json not found. Skipped.');
    else throw e;
  }
}

async function importRolePermissions(client) {
  try {
    const rows = await readJson('role_permissions.json');
    let ok = 0, skipped = 0;
    for (const rec of rows) {
      // Тоон утгаар: { role_id: 1, permission_id: 2 }
      if (rec.role_id != null && rec.permission_id != null) {
        try {
          await client.sql`
            INSERT INTO role_permissions(role_id, permission_id)
            VALUES (${rec.role_id}, ${rec.permission_id})
            ON CONFLICT DO NOTHING;`;
          ok++;
        } catch (e) {
          skipped++;
          console.warn(`⚠️ role_permissions insert failed (r=${rec.role_id}, p=${rec.permission_id}): ${e.message}`);
        }
      } else {
        skipped++;
        console.warn('⚠️ role_permissions record missing numeric role_id/permission_id → skipped');
      }
    }
    console.log(`✅ role_permissions: inserted=${ok}, skipped=${skipped}`);
  } catch (e) {
    if (e.code === 'ENOENT') console.warn('⚠️ role_permissions.json not found. Skipped.');
    else throw e;
  }
}

async function importUserRoles(client) {
  try {
    const rows = await readJson('user_roles.json');
    let ok = 0, skipped = 0;
    for (const rec of rows) {
      if (rec.user_id != null && rec.role_id != null) {
        try {
          await client.sql`
            INSERT INTO user_roles(user_id, role_id)
            VALUES (${rec.user_id}, ${rec.role_id})
            ON CONFLICT DO NOTHING;`;
          ok++;
        } catch (e) {
          skipped++;
          console.warn(`⚠️ user_roles insert failed (u=${rec.user_id}, r=${rec.role_id}): ${e.message}`);
        }
      } else {
        skipped++;
        console.warn('⚠️ user_roles record missing numeric user_id/role_id → skipped');
      }
    }
    console.log(`✅ user_roles: inserted=${ok}, skipped=${skipped}`);
  } catch (e) {
    if (e.code === 'ENOENT') console.warn('⚠️ user_roles.json not found. Skipped.');
    else throw e;
  }
}

async function run() {
  let client;
  try {
    client = await db.connect();
    console.log('🚀 Setup_database (global only)');

    await ensureTables(client);

    // Дараалал: permissions → roles → users → role_permissions
    await importPermissions(client);
    await importRoles(client);
    await importUsers(client);
    await importRolePermissions(client);
    await importUserRoles(client); // Энд нэмэгдсэн

    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Fatal:', err);
    process.exit(1);
  } finally {
    if (client) await client.release();
  }
}

run();
