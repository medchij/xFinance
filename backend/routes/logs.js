const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const db = require('../db');

// In-memory log storage (for demo purposes)
let logs = [];
const MAX_LOGS = 10000;

// Log file path (serverless env like Vercel has read-only FS except /tmp)
const isServerless = !!process.env.VERCEL || process.env.SERVERLESS_ENV === 'true';
const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : (isServerless ? os.tmpdir() : path.resolve(__dirname, '../logs'));
const LOG_FILE = path.join(LOG_DIR, 'combined.log');

// Ensure logs directory exists
async function ensureLogsDir() {
  const logsDir = LOG_DIR;
  try {
    await fs.mkdir(logsDir, { recursive: true });
  } catch (error) {
    console.warn('Log directory not writable; file logging disabled:', error?.code || error?.message || error);
  }
}

// Initialize logs directory
ensureLogsDir();

// POST /api/logs - Receive log from frontend
router.post('/', async (req, res) => {
  try {
    const logEntry = req.body;
    
    // Add server timestamp
    logEntry.serverTimestamp = new Date().toISOString();
    logEntry.source = 'combined';
    
    // Store in memory
    logs.push(logEntry);
    if (logs.length > MAX_LOGS) {
      logs.shift(); // Remove oldest log
    }
    
    // Write to database - TEMPORARILY DISABLED
    // try {
    //   const query = `
    //     INSERT INTO logs (timestamp, level, message, user_id, data, stack_trace, source, created_at)
    //     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    //   `;
    //   
    //   const values = [
    //     logEntry.timestamp || logEntry.serverTimestamp,
    //     logEntry.level || 'info',
    //     logEntry.message || '',
    //     logEntry.userId || logEntry.user_id || null,
    //     logEntry.data ? JSON.stringify(logEntry.data) : null,
    //     logEntry.stack || logEntry.stackTrace || null,
    //     logEntry.source || 'frontend'
    //   ];
    //   
    //   await db.query(query, values);
    // } catch (dbErr) {
    //   console.warn('Database logging error:', dbErr?.message || dbErr);
    //   // Continue even if DB fails
    // }
    
    // Write to file (best-effort; skip if FS not writable)
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(LOG_FILE, logLine);
    } catch (err) {
      // EROFS or other FS errors in serverless - don't fail request
      if (err && (err.code === 'EROFS' || err.code === 'EACCES' || err.code === 'ENOSPC')) {
        console.warn('File logging skipped:', err.code);
      } else {
        console.warn('File logging error:', err?.message || err);
      }
    }
    
    console.log(`[FRONTEND LOG] ${logEntry.level}: ${logEntry.message}`);
    
    res.status(200).json({ success: true, message: 'Log received' });
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).json({ success: false, error: 'Failed to save log' });
  }
});

// GET /api/logs - Get logs
router.get('/', (req, res) => {
  try {
    const { level, limit = 100, source } = req.query;
    
    let filteredLogs = [...logs];
    
    // Filter by level
    if (level) {
      filteredLogs = filteredLogs.filter(log => 
        log.level.toLowerCase() === level.toLowerCase()
      );
    }
    
    // Filter by source
    if (source) {
      filteredLogs = filteredLogs.filter(log => 
        log.source === source
      );
    }
    
    // Limit results
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      filteredLogs = filteredLogs.slice(-limitNum);
    }
    
    res.json({
      success: true,
      logs: filteredLogs,
      total: logs.length
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ success: false, error: 'Failed to get logs' });
  }
});

// DELETE /api/logs - Clear logs
router.delete('/', async (req, res) => {
  try {
    logs = [];
    
    // Clear log file
    await fs.writeFile(LOG_FILE, '');
    
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

module.exports = router;