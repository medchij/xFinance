const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// JWT Secret. Үүнийг .env файлд хадгалах нь илүү зөв.
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';

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
    req.user = user; // { id: 1, username: 'admin', ... }
    next();
  });
};

// POST /api/auth/login
// Authenticate a user and return a JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Нэвтрэх нэр, нууц үгээ оруулна уу.' });
  }

  try {
    // DB-ээс хэрэглэгч хайх
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Нэвтрэх нэр эсвэл нууц үг буруу.' });
    }

    const user = rows[0];
    
    // --- BCRYPT-ГҮЙ ХУВИЛБАР ---
    // !!! АЮУЛТАЙ !!! Нууц үгийг энгийн текстээр шалгаж байна.
    // Таны 'password_hash' баганад нууц үг шууд бичигдсэн байх ёстой.
    const isMatch = (password === user.password_hash);

    if (isMatch) {
      // JWT payload-д хэрэглэгчийн ID, нэр, үүргийг хийж өгөх
      const payload = {
        id: user.id,
        username: user.username,
        role_id: user.role_id
      };

      // Token үүсгэх (1 өдөр хүчинтэй)
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

      res.status(200).json({ 
        message: 'Амжилттай нэвтэрлээ',
        token: token,
      });

    } else {
      res.status(401).json({ message: 'Нэвтрэх нэр эсвэл нууц үг буруу.' });
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

    const userQuery = 'SELECT id, username, email, full_name, role_id FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Хэрэглэгч олдсонгүй' });
    }
    
    const user = userResult.rows[0];

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

    res.status(200).json({
      user: {
        ...user,
        password_hash: undefined, 
        role: roleName
      },
      permissions: permissions
    });

  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Серверийн дотоод алдаа' });
  }
});


module.exports = router;
