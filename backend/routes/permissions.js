const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET all available permissions
router.get('/', async (req, res) => {
    try {
        const { rows } = await query('SELECT id, name, description FROM permissions ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching permissions:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST - Create new permission
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    
    if (!name || !description) {
        return res.status(400).json({ message: 'name болон description шаардлагатай' });
    }
    
    try {
        // Check if permission already exists
        const existing = await query('SELECT id FROM permissions WHERE name = $1', [name]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Энэ эрх аль хэдийн байна' });
        }
        
        const { rows } = await query(
            'INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('❌ Error creating permission:', err.message);
        res.status(500).json({ message: 'Эрх нэмэхэд алдаа гарлаа', error: err.message });
    }
});

// PUT - Update permission
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name || !description) {
        return res.status(400).json({ message: 'name болон description шаардлагатай' });
    }
    
    try {
        const { rows } = await query(
            'UPDATE permissions SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name, description, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Эрх олдсонгүй' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('❌ Error updating permission:', err.message);
        res.status(500).json({ message: 'Эрх шинэчлэхэд алдаа гарлаа', error: err.message });
    }
});

// DELETE - Remove permission
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if permission is assigned to any role
        const rolePerms = await query('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1', [id]);
        if (parseInt(rolePerms.rows[0].count) > 0) {
            return res.status(409).json({ 
                message: 'Энэ эрх ажил үүрэгт оноогдсон байна. Эхлээд ажил үүрэгээс хас.' 
            });
        }
        
        const { rowCount } = await query('DELETE FROM permissions WHERE id = $1', [id]);
        
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Эрх олдсонгүй' });
        }
        
        res.json({ message: 'Эрх амжилттай устгагдлаа' });
    } catch (err) {
        console.error('❌ Error deleting permission:', err.message);
        res.status(500).json({ message: 'Эрх устгахад алдаа гарлаа', error: err.message });
    }
});

module.exports = router;
