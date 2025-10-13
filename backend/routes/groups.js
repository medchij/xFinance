const express = require('express');
const router = express.Router();

// GET all groups (mock data)
router.get('/', async (req, res) => {
  res.json([]);
});

module.exports = router;
