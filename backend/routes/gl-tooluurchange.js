const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.put('/', async (req, res) => {
  const { edd, company_id } = req.body;
  if (!edd || !company_id) {
    return res.status(400).json({ error: 'edd and company_id are required' });
  }
  try {
    const result = await query(
      'UPDATE gl_accounts SET counter = counter + 1 WHERE account_number = $1 AND company_id = $2 RETURNING *',
      [edd, company_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'GL account not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;