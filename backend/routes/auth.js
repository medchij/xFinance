const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// POST /api/auth/login
// Authenticate a user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Нэвтрэх нэр, нууц үгээ оруулна уу.' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM XF_USERS WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Нэвтрэх нэр эсвэл нууц үг буруу.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      // In a real app, you'd generate a JWT here. 
      // For now, we'll send a dummy token and user info.
      res.status(200).json({ 
        message: 'Амжилттай нэвтэрлээ',
        token: `dummy-token-for-${user.username}`,
        user: {
          id: user.id,
          name: user.name,
          username: user.username
        }
      });
    } else {
      res.status(401).json({ message: 'Нэвтрэх нэр эсвэл нууц үг буруу.' });
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Серверийн дотоод алдаа' });
  }
});

module.exports = router;
