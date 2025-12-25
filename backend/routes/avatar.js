const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// Upload avatar (Base64)
router.post('/:userId/avatar', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { avatar } = req.body;
    
    // Check if user is updating their own avatar or is admin
    const currentUserId = req.user.id || req.user.userId;
    if (currentUserId !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!avatar) {
      return res.status(400).json({ error: 'No avatar data provided' });
    }

    // Validate base64 format
    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Check size (limit to ~500KB base64 = ~375KB actual image)
    if (avatar.length > 700000) {
      return res.status(400).json({ error: 'Image too large. Please use an image under 500KB.' });
    }

    // Update user's avatar in database
    await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatar, userId]
    );

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatar
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete avatar
router.delete('/:userId/avatar', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is deleting their own avatar or is admin
    const currentUserId = req.user.id || req.user.userId;
    if (currentUserId !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update database
    await db.query(
      'UPDATE users SET avatar_url = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

module.exports = router;
