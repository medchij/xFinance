const express = require('express');
const router = express.Router();
const { db } = require('../db'); 
const bcrypt = require('bcrypt');

// GET all users
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, email, full_name, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST a new user
router.post('/', async (req, res) => {
    const { username, password, email, full_name } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ msg: 'Username, password, and email are required' });
    }

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const { rows } = await db.query(
            'INSERT INTO users (username, password_hash, email, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, created_at',
            [username, passwordHash, email, full_name]
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
    const { username, email, full_name, password } = req.body;

    try {
        let passwordHash;
        if (password) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }

        // Build the query dynamically based on what's provided
        const fields = [];
        const values = [];
        let query = 'UPDATE users SET ';

        if (username) { fields.push('username'); values.push(username); }
        if (email) { fields.push('email'); values.push(email); }
        if (full_name) { fields.push('full_name'); values.push(full_name); }
        if (passwordHash) { fields.push('password_hash'); values.push(passwordHash); }
        
        if (fields.length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }

        query += fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        query += ' WHERE id = $1 RETURNING id, username, email, full_name, created_at';
        values.unshift(id);

        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'Username or email already exists' });
        }
        res.status(500).send('Server error');
    }
});

// DELETE a user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
