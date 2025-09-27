const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/cf?company_id=...
// Handles fetching cash flow items for a specific company
router.get('/', async (req, res) => {
  const { company_id } = req.query;

  // Validate that company_id is provided
  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    // Fetch cash flow items matching the company_id
    const { rows } = await query('SELECT * FROM cf_items WHERE company_id = $1', [company_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`API Error fetching cf_items for company ${company_id}:`, error);
    res.status(500).json({ message: 'Failed to fetch CF items' });
  }
});

module.exports = router;
