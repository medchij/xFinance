const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { sendPasswordResetEmail } = require('../services/emailService');

// Ensure password_reset_tokens table exists (idempotent)
async function ensurePasswordResetTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// JWT Secret - CRITICAL: Must be set in .env.local or Vercel environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-very-secret-key') {
  console.warn('⚠️ WARNING: JWT_SECRET is using default value in production! This is a security risk. Set JWT_SECRET environment variable.');
}

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ message: 'Token олдсонгүй' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token хүчингүй байна' });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/login
// Authenticate a user and return a JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ message: 'Нэвтрэх нэр, нууц үгээ оруулна уу.' });
  }

  try {
    // Сүүлийн 30 минутын турш хэдэн удаа буруу оролдсоныг шалгах
    const { rows: attempts } = await db.query(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE username = $1 
       AND success = false 
       AND attempt_time > NOW() - INTERVAL '30 minutes'`,
      [username]
    );
    
    const failedAttempts = parseInt(attempts[0].count);
    
    // 10 ба түүнээс дээш буруу оролдлого бол блоклох
    if (failedAttempts >= 10) {
      // Буруу оролдлого бүртгэх
      await db.query(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, false)',
        [username, ipAddress]
      );
      
      return res.status(429).json({ 
        message: 'Та 10 удаа буруу нууц үг оруулсан тул 30 минутын турш түгжигдлээ.',
        blockedUntil: new Date(Date.now() + 30 * 60000).toISOString()
      });
    }
    
    // DB-ээс хэрэглэгч хайх
    const { rows: users } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (users.length === 0) {
      // Буруу оролдлого бүртгэх
      await db.query(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, false)',
        [username, ipAddress]
      );
      
      const remainingAttempts = Math.max(0, 10 - (failedAttempts + 1));
      return res.status(401).json({ 
        message: `Нэвтрэх нэр эсвэл нууц үг буруу. ${remainingAttempts} оролдлого үлдсэн.`
      });
    }

    const user = users[0];
    
    // Хэрэглэгч идэвхигүй эсэхийг шалгах
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Таны эрх хаагдсан байна. Админтай холбогдоно уу.' });
    }
    
    // Ирсэн нууц үгийг DB дэх hash-тай харьцуулах
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      // Амжилттай нэвтэрсэн - буруу оролдлогуудыг устгах
      await db.query(
        'DELETE FROM login_attempts WHERE username = $1',
        [username]
      );
      
      // Амжилттай нэвтэрсэн бүртгэл хийх
      await db.query(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, true)',
        [username, ipAddress]
      );
      
      // JWT payload-д хэрэглэгчийн мэдээллийг оруулах
      const payload = {
        id: user.id,
        username: user.username,
        role_id: user.role_id // role_id-г шууд user объектоос авах
      };

      // Token үүсгэх (1 өдөр хүчинтэй)
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

      res.status(200).json({ 
        message: 'Амжилттай нэвтэрлээ',
        token: token,
      });

    } else {
      // Буруу нууц үг - оролдлого бүртгэх
      await db.query(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, false)',
        [username, ipAddress]
      );
      
      const remainingAttempts = Math.max(0, 10 - (failedAttempts + 1));
      res.status(401).json({ 
        message: `Нэвтрэх нэр эсвэл нууц үг буруу. ${remainingAttempts} оролдлого үлдсэн.`
      });
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Серверийн дотоод алдаа' });
  }
});


// GET /api/auth/me
// Get current user's info and permissions using a valid token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // *** ЗАСВАРЛАСАН ХЭСЭГ: JOIN ашиглан role_id-г авах ***
    const userQuery = `
      SELECT u.id, u.username, u.email, u.full_name, u.allowed_companies, u.is_active, ur.role_id
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1
    `;
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Хэрэглэгч олдсонгүй' });
    }
    
    const user = userResult.rows[0];
    
    // Хэрэглэгч идэвхигүй эсэхийг шалгах
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Таны эрх хаагдсан байна. Админтай холбогдоно уу.' });
    }

    // role_id байхгүй бол эрх хайхгүй
    if (!user.role_id) {
      return res.status(200).json({
        user: { ...user, password_hash: undefined, role: null },
        permissions: []
      });
    }

    const permissionsQuery = `
      SELECT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;
    const permissionsResult = await db.query(permissionsQuery, [user.role_id]);
    
    const permissions = permissionsResult.rows.map(row => row.name);

    const roleQuery = 'SELECT name FROM roles WHERE id = $1';
    const roleResult = await db.query(roleQuery, [user.role_id]);
    const roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : null;

    // password_hash-ийг арилгаж, бусад өгөгдлийг хадгалах
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      user: {
        ...userWithoutPassword,
        role: roleName
      },
      permissions: permissions
    });

  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Серверийн дотоод алдаа' });
  }
});

// POST /api/auth/forgot-password
// Нууц үг сэргээх хүсэлт
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Имэйл хаяг оруулна уу' });
  }

  try {
    // Make sure the reset token table exists (safe to run repeatedly)
    await ensurePasswordResetTable();

    // Хэрэглэгч байгаа эсэхийг шалгах
    const userResult = await db.query(
      'SELECT id, username, email, full_name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Security: Хэрэглэгч олдсонгүй гэж хэлэхгүй байх (email enumeration attack-аас хамгаалах)
      return res.status(200).json({ 
        message: 'Хэрэв имэйл бүртгэлтэй бол нууц үг сэргээх заавар илгээгдсэн байна.' 
      });
    }

    const user = userResult.rows[0];

    // Reset токен үүсгэх (random 32 bytes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Токен хэш хийх (database-д хадгалах)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Токен 1 цаг хүчинтэй байна
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Database-д хадгалах
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, hashedToken, expiresAt]
    );

    // Email илгээх
    await sendPasswordResetEmail(user.email, resetToken, user.full_name || user.username);

    res.status(200).json({ 
      message: 'Нууц үг сэргээх заавар таны имэйл хаягт илгээгдлээ.' 
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    console.error('   Stack:', error.stack);
    console.error('   Message:', error.message);
    res.status(500).json({ 
      message: 'Нууц үг сэргээх хүсэлт илгээхэд алдаа гарлаа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/reset-password
// Нууц үг шинэчлэх
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Токен болон шинэ нууц үг шаардлагатай' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Нууц үг дор хаяж 6 тэмдэгт байх ёстой' });
  }

  try {
    // Токен хэш хийх
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Токен олох, хугацаа шалгах
    const tokenResult = await db.query(
      `SELECT user_id, expires_at, used 
       FROM password_reset_tokens 
       WHERE token = $1`,
      [hashedToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Токен буруу эсвэл хүчингүй байна' });
    }

    const resetToken = tokenResult.rows[0];

    // Токен хэрэглэгдсэн эсэхийг шалгах
    if (resetToken.used) {
      return res.status(400).json({ message: 'Энэ токен аль хэдийн хэрэглэгдсэн байна' });
    }

    // Хугацаа дууссан эсэхийг шалгах
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ message: 'Токены хугацаа дууссан байна' });
    }

    // Шинэ нууц үг хэш хийх
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Нууц үг шинэчлэх
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Токен хэрэглэгдсэн гэж тэмдэглэх
    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
      [hashedToken]
    );
    
    // Нууц үг шинэчлэгдсэн тул буруу оролдлогуудыг устгах
    const { rows: users } = await db.query('SELECT username FROM users WHERE id = $1', [resetToken.user_id]);
    if (users.length > 0) {
      await db.query('DELETE FROM login_attempts WHERE username = $1', [users[0].username]);
    }

    res.status(200).json({ message: 'Нууц үг амжилттай шинэчлэгдлээ' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Нууц үг шинэчлэхэд алдаа гарлаа' });
  }
});

// POST /api/auth/unlock-user
// Админ хэрэглэгчийн блокыг арилгах
router.post('/unlock-user', verifyToken, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username шаардлагатай' });
  }

  try {
    // Зөвхөн admin эрхтэй хэрэглэгч блок арилгах боломжтой
    const { rows: currentUser } = await db.query('SELECT role_id FROM users WHERE id = $1', [req.user.id]);
    
    if (currentUser.length === 0 || currentUser[0].role_id !== 1) {
      return res.status(403).json({ message: 'Зөвхөн админ энэ үйлдлийг хийх эрхтэй' });
    }

    // Буруу оролдлогуудыг устгах
    await db.query('DELETE FROM login_attempts WHERE username = $1', [username]);

    res.status(200).json({ message: `${username} хэрэглэгчийн блокыг амжилттай арилгалаа` });

  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({ message: 'Блок арилгахад алдаа гарлаа' });
  }
});

// GET /api/auth/blocked-users
// Блоклогдсон хэрэглэгчдийн жагсаалт
router.get('/blocked-users', verifyToken, async (req, res) => {
  try {
    // Зөвхөн админ
    const { rows: currentUser } = await db.query('SELECT role_id FROM users WHERE id = $1', [req.user.id]);
    
    if (currentUser.length === 0 || currentUser[0].role_id !== 1) {
      return res.status(403).json({ message: 'Зөвхөн админ энэ мэдээллийг харах эрхтэй' });
    }

    // Сүүлийн 30 минутын турш 10+ буруу оролдлого хийсэн хэрэглэгчид
    const { rows: blockedUsers } = await db.query(`
      SELECT 
        username,
        COUNT(*) as failed_attempts,
        MAX(attempt_time) as last_attempt
      FROM login_attempts
      WHERE success = false
        AND attempt_time > NOW() - INTERVAL '30 minutes'
      GROUP BY username
      HAVING COUNT(*) >= 10
      ORDER BY last_attempt DESC
    `);

    res.status(200).json(blockedUsers);

  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ message: 'Блоклогдсон хэрэглэгчдийг татахад алдаа гарлаа' });
  }
});


module.exports = router;
