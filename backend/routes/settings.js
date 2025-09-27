const express = require('express');
const router = express.Router();
const { query } = require('../db'); // Go up one level to find db.js

// --- Middleware to check for company_id ---
// This will apply to all routes in this file
router.use((req, res, next) => {
  // In Express, it's common to get IDs from URL parameters or headers.
  // Let's check both query and headers for robustness.  
  const company_id = req.query.company_id || req.headers['x-company-id'];

  if (!company_id) {
    return res.status(400).json({ message: 'company_id is required as a query parameter or x-company-id header.' });
  }

  // Attach company_id to the request object so all routes can access it
  req.company_id = company_id;
  next(); // Continue to the next middleware or route handler
});

// --- Route Handlers ---

// GET /api/settings?company_id=...
// Handles fetching all settings for the given company
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM settings WHERE company_id = $1 ORDER BY tab, name', [req.company_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Error fetching settings for ${req.company_id}:`, error);
    res.status(500).json({ message: 'Failed to fetch settings.' });
  }
});

// POST /api/settings?company_id=...
// Handles adding a new setting for the given company
router.post('/', async (req, res) => {
  const { name, value, tab } = req.body;

  if (!name || value === undefined || !tab) {
    return res.status(400).json({ message: 'name, value, and tab are required fields in the body' });
  }

  try {
    const { rows } = await query(
      'INSERT INTO settings (company_id, name, value, tab) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.company_id, name, value, tab]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(`Error adding setting for ${req.company_id}:`, error);
    res.status(500).json({ message: 'Failed to add new setting.' });
  }
});

// PUT /api/settings/:id?company_id=...
// Handles updating an existing setting
router.put('/:id', async (req, res) => {
  const { id } = req.params; // Get the setting ID from the URL path
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ message: 'value is a required field in the body' });
  }

  try {
    const { rows } = await query(
      'UPDATE settings SET value = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [value, id, req.company_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: `Setting with ID ${id} not found for this company.` });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Error updating setting ${id} for ${req.company_id}:`, error);
    res.status(500).json({ message: `Failed to update setting.` });
  }
});

module.exports = router;
