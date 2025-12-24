const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/authenticateToken');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.params.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// Upload avatar
router.post('/:userId/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is updating their own avatar or is admin
    const currentUserId = req.user.id || req.user.userId;
    if (currentUserId !== parseInt(userId) && req.user.role !== 'admin') {
      // Delete uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get old avatar to delete it
    const oldAvatarResult = await db.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    // Construct avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user's avatar URL in database
    await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, userId]
    );

    // Delete old avatar file if it exists
    if (oldAvatarResult.rows[0]?.avatar_url) {
      const oldFilePath = path.join(__dirname, '..', oldAvatarResult.rows[0].avatar_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    // Delete uploaded file if database update fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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

    // Get avatar URL
    const result = await db.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows[0]?.avatar_url) {
      return res.status(404).json({ error: 'No avatar found' });
    }

    // Delete file
    const filePath = path.join(__dirname, '..', result.rows[0].avatar_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
