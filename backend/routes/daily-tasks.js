const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// Get daily tasks for specific date (default: today)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const date = req.query.date;
    
    let result;
    if (date) {
      // If date is provided, filter by date
      result = await pool.query(
        'SELECT * FROM daily_tasks WHERE user_id = $1 AND due_date = $2 ORDER BY created_at DESC',
        [userId, date]
      );
    } else {
      // If no date, return all tasks
      result = await pool.query(
        'SELECT * FROM daily_tasks WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Ажлууд татахад алдаа гарлаа.' });
  }
});

// Create new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { task, due_date, image_url, image_position } = req.body;
    
    if (!task || !task.trim()) {
      return res.status(400).json({ error: 'Ажлын агуулга оруулна уу.' });
    }
    
    const dueDate = due_date || new Date().toISOString().split('T')[0];
    
    // Debug log for image payload
    if (image_url) {
      console.log('[daily-tasks:create] image_url provided, length:', image_url.length);
    } else {
      console.log('[daily-tasks:create] no image_url provided');
    }

    const result = await pool.query(
      'INSERT INTO daily_tasks (user_id, task, due_date, image_url, image_position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, task.trim(), dueDate, image_url || null, image_position || 'contain']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Ажил үүсгэхэд алдаа гарлаа.' });
  }
});

// Update task (toggle completion)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const taskId = req.params.id;
    const { completed } = req.body;
    
    // Check if task belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ажил олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
    
    const result = await pool.query(
      'UPDATE daily_tasks SET completed = $1 WHERE id = $2 RETURNING *',
      [completed, taskId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Ажил шинэчлэхэд алдаа гарлаа.' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const taskId = req.params.id;
    
    // Check if task belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ажил олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
    
    await pool.query('DELETE FROM daily_tasks WHERE id = $1', [taskId]);
    
    res.json({ message: 'Ажил амжилттай устгагдлаа.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Ажил устгахад алдаа гарлаа.' });
  }
});

// Upload task image (base64)
router.post('/:id/image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const taskId = req.params.id;
    const { imageBase64, imagePosition } = req.body;
    
    // Check if task belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ажил олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Зураг оруулна уу.' });
    }
    
    // Validate base64 format
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Буруу зургийн формат.' });
    }
    
    // Check size (approx 2MB for base64)
    if (imageBase64.length > 2000000) {
      return res.status(400).json({ error: 'Зургийн хэмжээ хэтэрхий том байна (max 2MB base64).' });
    }
    
    // Update task with base64 image
    const result = await pool.query(
      'UPDATE daily_tasks SET image_url = $1, image_position = $2 WHERE id = $3 RETURNING *',
      [imageBase64, imagePosition || 'contain', taskId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Upload task image error:', error);
    res.status(500).json({ error: 'Зураг upload хийхэд алдаа гарлаа.' });
  }
});

// Update image settings (position, scale, title offset, text styling, notes)
router.patch('/:id/image/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const taskId = req.params.id;
    const { image_position, image_scale, image_offset_x, image_offset_y, title_offset_x, title_offset_y, title_font_size, title_color, title_font_family, task, notes } = req.body;
  
    // Check if task belongs to user
    const checkResult = await pool.query(
      'SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
  
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ажил олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
  
    const imgOffsetX = Number.isFinite(parseInt(image_offset_x)) ? parseInt(image_offset_x) : 0;
    const imgOffsetY = Number.isFinite(parseInt(image_offset_y)) ? parseInt(image_offset_y) : 0;
    const titleOffsetX = Number.isFinite(parseInt(title_offset_x)) ? parseInt(title_offset_x) : 0;
    const titleOffsetY = Number.isFinite(parseInt(title_offset_y)) ? parseInt(title_offset_y) : 0;
  
    const fontSize = Number.isFinite(parseInt(title_font_size)) ? parseInt(title_font_size) : 17;
    const color = title_color || '#ffffff';
    const fontFamily = title_font_family || 'Headline';
  
    const result = await pool.query(
      `UPDATE daily_tasks 
       SET image_position = $1, image_scale = $2, image_offset_x = $3, image_offset_y = $4, 
           title_offset_x = $5, title_offset_y = $6, title_font_size = $7, title_color = $8, title_font_family = $9,
           task = $10, notes = $11
       WHERE id = $12 AND user_id = $13 
       RETURNING *`,
      [
        image_position || 'contain',
        image_scale || 1,
        imgOffsetX,
        imgOffsetY,
        titleOffsetX,
        titleOffsetY,
        fontSize,
        color,
        fontFamily,
        task || checkResult.rows[0].task,
        notes || '',
        taskId,
        userId
      ]
    );
  
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update image settings error:', error);
    res.status(500).json({ error: 'Зургийн тохиргоо шинэчлэхэд алдаа гарлаа.' });
  }
});

// Delete task image (base64)
router.delete('/:id/image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const taskId = req.params.id;
    
    const checkResult = await pool.query(
      'SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ажил олдсонгүй эсвэл танд хандах эрх байхгүй.' });
    }
    
    // Just set image_url to NULL (no file deletion needed for base64)
    await pool.query(
      'UPDATE daily_tasks SET image_url = NULL WHERE id = $1',
      [taskId]
    );
    
    res.json({ message: 'Зураг амжилттай устгагдлаа.' });
  } catch (error) {
    console.error('Delete task image error:', error);
    res.status(500).json({ error: 'Зураг устгахад алдаа гарлаа.' });
  }
});

module.exports = router;
