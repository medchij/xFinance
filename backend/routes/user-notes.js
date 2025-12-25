const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// Get all notes for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Тэмдэглэл татахад алдаа гарлаа.' });
  }
});

// Create new note
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Агуулга оруулна уу.' });
    }
    
    const result = await pool.query(
      'INSERT INTO user_notes (user_id, content) VALUES ($1, $2) RETURNING *',
      [userId, content.trim()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Тэмдэглэл үүсгэхэд алдаа гарлаа.' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const noteId = req.params.id;
    
    // Check if note belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM user_notes WHERE id = $1 AND user_id = $2',
      [noteId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тэмдэглэл олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
    
    await pool.query('DELETE FROM user_notes WHERE id = $1', [noteId]);
    
    res.json({ message: 'Тэмдэглэл амжилттай устгагдлаа.' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Тэмдэглэл устгахад алдаа гарлаа.' });
  }
});

module.exports = router;
