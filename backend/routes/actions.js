/**
 * API Routes for Actions (with numeric codes)
 */

const express = require('express');
const { query } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Get all actions with their codes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, code, name, description, category
      FROM actions
      ORDER BY code
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] GET /api/actions:', error.message);
    return res.status(500).json({ message: 'Үйлдлүүдийг татахад алдаа гарлаа' });
  }
});

// Get actions by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const result = await query(`
      SELECT id, code, name, description, category
      FROM actions
      WHERE category = $1
      ORDER BY code
    `, [category]);

    return res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] GET /api/actions/category:', error.message);
    return res.status(500).json({ message: 'Үйлдлүүдийг татахад алдаа гарлаа' });
  }
});

// Get all action categories
router.get('/list/categories', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT category
      FROM actions
      ORDER BY category
    `);

    return res.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error('[ERROR] GET /api/actions/list/categories:', error.message);
    return res.status(500).json({ message: 'Ангиллыг татахад алдаа гарлаа' });
  }
});

// Get role's actions (by role_id)
router.get('/role/:roleId', authenticateToken, async (req, res) => {
  try {
    const { roleId } = req.params;
    const result = await query(`
      SELECT a.id, a.code, a.name, a.description, a.category
      FROM actions a
      INNER JOIN role_actions ra ON a.code = ra.action_code
      WHERE ra.role_id = $1
      ORDER BY a.code
    `, [roleId]);

    return res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] GET /api/actions/role/:roleId:', error.message);
    return res.status(500).json({ message: 'Ажил үүргийн үйлдлүүдийг татахад алдаа гарлаа' });
  }
});

// Assign actions to role
router.post('/role/:roleId/assign', authenticateToken, async (req, res) => {
  try {
    const { roleId } = req.params;
    const { actionCodes } = req.body; // Array of action codes

    if (!Array.isArray(actionCodes)) {
      return res.status(400).json({ message: 'actionCodes нь массив байх ёстой' });
    }

    // Delete all existing role_actions for this role
    await query('DELETE FROM role_actions WHERE role_id = $1', [roleId]);

    // Insert new action codes
    for (const code of actionCodes) {
      await query(
        'INSERT INTO role_actions (role_id, action_code) VALUES ($1, $2)',
        [roleId, code]
      );
    }

    return res.json({ message: 'Үйлдлүүдийг амжилттай өглөө' });
  } catch (error) {
    console.error('[ERROR] POST /api/actions/role/:roleId/assign:', error.message);
    return res.status(500).json({ message: 'Үйлдлүүдийг оноохдоо алдаа гарлаа' });
  }
});

module.exports = router;
