const express = require('express');
const router = express.Router();

// GET /api/env
// Provides essential environment variables to the frontend.
router.get('/', (req, res) => {
  const host = req.headers.host || 'localhost:3000'; // Fallback for safety

  // Construct the base URL, preferring the .env variable if available
  // otherwise, dynamically determine it from request headers.
  const protocol = req.protocol;
  const baseUrl = process.env.REACT_APP_API_URL || `${protocol}://${host}`;

  res.status(200).json({
    BASE_URL: baseUrl,
    // Always use the value from .env for DATA_DIR for consistency
    DATA_DIR: process.env.DATA_DIR || 'backend/data', // Default fallback
    NODE_ENV: process.env.NODE_ENV || 'production',
  });
});

module.exports = router;
