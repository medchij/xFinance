const express = require('express');
const router = express.Router();

// GET /api/ping
// A simple health check endpoint to confirm the server is running.
router.get('/', (req, res) => {
  // Respond with a 200 OK status and a simple JSON object
  res.status(200).json({ ok: true });
});

module.exports = router;
