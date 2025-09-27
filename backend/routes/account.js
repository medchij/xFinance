const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/account?company_id=...
// Handles fetching accounts for a specific company
router.get('/', async (req, res) => {
  const { company_id } = req.query;

  // Validate that company_id is provided
  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    // Fetch accounts matching the company_id
    const { rows } = await query('SELECT * FROM accounts WHERE company_id = $1', [company_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`API Error fetching accounts for company ${company_id}:`, error);
    res.status(500).json({ message: `Failed to fetch accounts` });
  }
});

module.exports = router;
