const express = require('express');
const router = express.Router();
const { query } = require('../db'); 
const bcrypt = require('bcrypt');

// GET all users
router.get('/', async (req, res) => {
    try {
    const { rows } = await query('SELECT id, username, email, full_name, role_id, is_active, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST a new user
router.post('/', async (req, res) => {
    const { username, password, email, full_name, role_id } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ msg: 'Username, password, and email are required' });
    }

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const { rows } = await query(
            'INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, full_name, role_id, created_at',
            [username, passwordHash, email, full_name, role_id || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ msg: 'Username or email already exists' });
        }
        res.status(500).send('Server error');
    }
});

// PUT (update) a user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, full_name, password, is_active, role_id } = req.body;

    try {
        let passwordHash;
        if (password) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }

        // Build the query dynamically based on what's provided
        const fields = [];
        const values = [];
        let updateQuery = 'UPDATE users SET ';

        if (username) { fields.push('username'); values.push(username); }
        if (email) { fields.push('email'); values.push(email); }
        if (full_name) { fields.push('full_name'); values.push(full_name); }
        if (passwordHash) { fields.push('password_hash'); values.push(passwordHash); }
        if (is_active !== undefined) { fields.push('is_active'); values.push(is_active); }
        if (role_id !== undefined) { fields.push('role_id'); values.push(role_id); }
        
        if (fields.length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }

        updateQuery += fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        updateQuery += ' WHERE id = $1 RETURNING id, username, email, full_name, role_id, is_active, created_at';
        values.unshift(id);

    const { rows } = await query(updateQuery, values);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating user:', err);
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'Username or email already exists' });
        }
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// DELETE a user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// PATCH - Toggle user active status
router.patch('/:id/toggle-active', async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await query(
            'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, username, is_active',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const status = rows[0].is_active ? 'идэвхитэй' : 'идэвхигүй';
        res.json({ 
            msg: `Хэрэглэгч ${status} болгогдлоо`,
            user: rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// GET user roles
router.get('/:id/roles', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await query(
            `SELECT r.id, r.name FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1
             ORDER BY r.name`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// POST - Assign roles to user (replace all existing roles)
router.post('/:id/roles', async (req, res) => {
    const { id } = req.params;
    const { roleIds } = req.body; // Array of role IDs

    if (!Array.isArray(roleIds) || roleIds.length === 0) {
        return res.status(400).json({ msg: 'roleIds must be a non-empty array' });
    }

    try {
        // Delete existing roles for this user
        await query('DELETE FROM user_roles WHERE user_id = $1', [id]);

        // Insert new roles
        const placeholders = roleIds
            .map((_, i) => `($1, $${i + 2})`)
            .join(',');
        
        await query(
            `INSERT INTO user_roles (user_id, role_id) VALUES ${placeholders}`,
            [id, ...roleIds]
        );

        res.json({ msg: 'Хэрэглэгчийн ажил үүргүүд амжилттай солигдлоо' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

module.exports = router;
