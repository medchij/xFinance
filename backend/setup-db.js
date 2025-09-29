const { pool } = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupDatabase() {
  const client = await pool.connect();
  console.log('✅ Мэдээллийн сантай холбогдлоо.');

  try {
    // 1. XF_USERS хүснэгт үүсгэх
    await client.query(`
      CREATE TABLE IF NOT EXISTS XF_USERS (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255)
      );
    `);
    console.log('✅ XF_USERS хүснэгт бэлэн боллоо.');

    // 2. Анхны хэрэглэгчдийг нэмэх
    const users = [
      { username: 'admin', password: 'password123', name: 'Administrator' },
      { username: 'user', password: 'password', name: 'Standard User' }
    ];

    for (const userData of users) {
      const { username, password, name } = userData;
      const res = await client.query('SELECT * FROM XF_USERS WHERE username = $1', [username]);

      if (res.rows.length === 0) {
        console.log(`⏳ '${username}' хэрэглэгчийг нэмж байна...`);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        await client.query(
          'INSERT INTO XF_USERS (username, password_hash, name) VALUES ($1, $2, $3)',
          [username, passwordHash, name]
        );
        console.log(`✅ '${username}' хэрэглэгчийг амжилттай нэмлээ.`);

      } else {
        console.log(`👉 '${username}' хэрэглэгч аль хэдийн бүртгэлтэй байна.`);
      }
    }

  } catch (err) {
    console.error('❌ Мэдээллийн баазыг бэлдэхэд алдаа гарлаа:', err);
  } finally {
    await client.release();
    console.log('🔌 Мэдээллийн сангаас холболтыг саллаа.');
    await pool.end(); // Close all connections in the pool
    console.log('🏁 Pool-ийн бүх холболтыг хаалаа.');
  }
}

setupDatabase();
