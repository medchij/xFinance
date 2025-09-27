const express = require('express');
const router = express.Router();
const { query } = require('../db'); // Go up one level to find db.js

// GET /api/companies
// Handles fetching all companies
router.get('/', async (req, res) => {
  try {
    // Fetch all companies, ordered by name
    const { rows } = await query('SELECT id, name FROM companies ORDER BY name');
    res.status(200).json(rows);
  } catch (error) {
    console.error('API Error fetching companies:', error);
    res.status(500).json({ message: 'Failed to fetch companies.' });
  }
});

module.exports = router;
