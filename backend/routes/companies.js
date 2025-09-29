const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection

// Endpoint to get the list of companies from the database
router.get('/', async (req, res) => {
  try {
    // Query the database to get the list of companies
    const { rows } = await db.query('SELECT id, name FROM companies');
    
    // Send the list of companies as a JSON response
    res.json(rows);
  } catch (error) {
    console.error('Failed to get company list from database:', error);
    res.status(500).json({ message: 'Error fetching company list from database' });
  }
});

module.exports = router;
