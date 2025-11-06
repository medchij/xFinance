const express = require('express');
const router = express.Router();
const db = require('../db'); // Import the database connection
const authenticateToken = require('../middleware/authenticateToken');

// Endpoint to get the list of companies from the database
router.get('/', authenticateToken, async (req, res) => {
  try {
    // JWT payload-с id авах (login endpoint дээр 'id' гэж хадгалсан)
    const userId = req.user.id;
    
    // Хэрэглэгчийн allowed_companies-г шалгах
    const userResult = await db.query(
      'SELECT allowed_companies FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const allowedCompanies = userResult.rows[0].allowed_companies;
    
    // allowed_companies NULL буюу хоосон массив бол хоосон жагсаалт буцаах
    if (!allowedCompanies || allowedCompanies.length === 0) {
      console.log(`🚫 User ${userId} has no allowed_companies - returning empty list`);
      return res.json([]);
    }
    
    // Зөвхөн зөвшөөрөгдсөн компаниудыг буцаах
    const { rows } = await db.query(
      'SELECT id, name FROM companies WHERE id = ANY($1)',
      [allowedCompanies]
    );
    
    console.log(`✅ User ${userId} has access to ${rows.length} companies:`, allowedCompanies);
    res.json(rows);
  } catch (error) {
    console.error('Failed to get company list from database:', error);
    res.status(500).json({ message: 'Error fetching company list from database' });
  }
});

module.exports = router;
