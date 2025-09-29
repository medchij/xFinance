const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Endpoint to get the list of companies
router.get('/', (req, res) => {
  const dataPath = path.join(__dirname, '../');
  try {
    const directories = fs.readdirSync(dataPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('data'))
      .map(dirent => {
        if (dirent.name === 'data') {
          return 'default';
        }
        return dirent.name.replace('data', '').toLowerCase();
      });
    res.json(directories);
  } catch (error) {
    console.error('Failed to get company list:', error);
    res.status(500).json({ message: 'Error fetching company list' });
  }
});

module.exports = router;
