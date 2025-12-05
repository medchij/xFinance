const express = require('express');
const router = express.Router();
const { query } = require('../db');
const jwt = require('jsonwebtoken');

// Middleware: JWT-ээс user_id авах
const extractUserId = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header шаардлагатай.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Буруу эсвэл хугацаа дууссан token.' });
  }
};

// GET /api/user-settings - Хэрэглэгчийн тохиргоо авах
router.get('/', extractUserId, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
      [req.userId]
    );

    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.status(200).json(settings);
  } catch (error) {
    console.error('Тохиргоо унших алдаа:', error);
    res.status(500).json({ message: 'Тохиргоо унших явцад алдаа гарлаа.' });
  }
});

// POST /api/user-settings - Тохиргоо хадгалах / шинэчлэх
router.post('/', extractUserId, async (req, res) => {
  const { setting_key, setting_value } = req.body;

  if (!setting_key || setting_value === undefined) {
    return res.status(400).json({ message: 'setting_key болон setting_value шаардлагатай.' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, setting_key)
       DO UPDATE SET setting_value = $3, updated_at = NOW()
       RETURNING *`,
      [req.userId, setting_key, setting_value]
    );

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Тохиргоо хадгалах алдаа:', error);
    res.status(500).json({ message: 'Тохиргоо хадгалах явцад алдаа гарлаа.' });
  }
});

// PUT /api/user-settings/batch - Олон тохиргоог нэгэн зэрэг шинэчлэх
router.put('/batch', extractUserId, async (req, res) => {
  const settings = req.body; // { language: "mn", theme: "dark", ... }

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ message: 'Settings объект шаардлагатай.' });
  }

  try {
    let savedCount = 0;
    
    for (const [key, value] of Object.entries(settings)) {
      // Эхлээд байгаа эсэхийг шалгах
      const checkResult = await query(
        'SELECT id FROM user_settings WHERE user_id = $1 AND setting_key = $2',
        [req.userId, key]
      );

      if (checkResult.rows.length > 0) {
        // Шинэчлэх
        await query(
          'UPDATE user_settings SET setting_value = $1, updated_at = NOW() WHERE user_id = $2 AND setting_key = $3',
          [String(value), req.userId, key]
        );
      } else {
        // Нэмэх
        await query(
          'INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [req.userId, key, String(value)]
        );
      }
      savedCount++;
    }

    res.status(200).json({ message: 'Бүх тохиргоо амжилттай хадгалагдлаа.', count: savedCount });
  } catch (error) {
    console.error('Batch тохиргоо хадгалах алдаа:', error);
    res.status(500).json({ message: 'Тохиргоо хадгалах явцад алдаа гарлаа.' });
  }
});

// DELETE /api/user-settings/:key - Тохиргоо устгах
router.delete('/:key', extractUserId, async (req, res) => {
  const { key } = req.params;

  try {
    const { rowCount } = await query(
      'DELETE FROM user_settings WHERE user_id = $1 AND setting_key = $2',
      [req.userId, key]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Тохиргоо олдсонгүй.' });
    }

    res.status(200).json({ message: 'Тохиргоо амжилттай устгагдлаа.' });
  } catch (error) {
    console.error('Тохиргоо устгах алдаа:', error);
    res.status(500).json({ message: 'Тохиргоо устгах явцад алдаа гарлаа.' });
  }
});

module.exports = router;
