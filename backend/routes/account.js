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
// Handles creating a new account
router.post('/', async (req, res) => {
  const { company_id, account_number, account_name, currency, branch } = req.body;

  // Validate required fields
  if (!company_id || !account_number || !account_name || !currency || !branch) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Нэвтэрсэн хэрэглэгчийн id-г авах (Authorization header-аас JWT-г задлах)
  let userId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      userId = decoded && decoded.id ? decoded.id : null;
    } catch (e) {
      userId = null;
    }
  }

  try {
    // Insert new account
    const { rows } = await query(
      'INSERT INTO accounts (company_id, account_number, account_name, currency, branch, created_at, updated_at, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $6) RETURNING *',
      [company_id, account_number, account_name, currency, branch, userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('API Error creating account:', error);
    res.status(500).json({ message: 'Failed to create account' });
  }
});

module.exports = router;
