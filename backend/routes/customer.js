const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/customer?company_id=...
// Handles fetching customers for a specific company
router.get('/', async (req, res) => {
  const { company_id } = req.query;

  // Validate that company_id is provided
  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required' });
  }

  try {
    // Fetch customers matching the company_id
    const { rows } = await query('SELECT * FROM customers WHERE company_id = $1', [company_id]);
    res.status(200).json(rows);
  } catch (error) {
    // If table doesn't exist, return empty array instead of 500 error
    if (error.code === '42P01') {
      console.warn(`⚠️ customers table not found for company ${company_id}`);
      return res.status(200).json([]);
    }
    console.error(`API Error fetching customers for company ${company_id}:`, error);
    res.status(500).json({ message: `Failed to fetch customers` });
  }
});

module.exports = router;
