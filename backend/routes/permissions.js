const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET all available permissions
router.get('/', async (req, res) => {
    try {
        // Query the permissions table, which was populated by setup-database.js
        const { rows } = await db.query('SELECT id, name, description FROM permissions ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching permissions:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
