const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  const company_id = req.query.company_id;
  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }
  try {
    const result = await query('SELECT * FROM currencies WHERE company_id = $1', [company_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;