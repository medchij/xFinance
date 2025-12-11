/**
 * Log Rotation Service
 * Automatically manages log files and database cleanup
 */
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

class LogRotationService {
  constructor() {
    this.config = {
      // File rotation config
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5, // Keep 5 rotated files
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      
      // Database cleanup config
      maxDbLogs: 100000, // Maximum logs in database
      logRetentionDays: 30, // Keep logs for 30 days
      cleanupInterval: 6 * 60 * 60 * 1000, // Cleanup every 6 hours
      
      // Archive config
      enableArchive: true,
      archiveOlderThanDays: 7
    };
    
    this.logDir = process.env.LOG_DIR || path.resolve(__dirname, '../logs');
    this.archiveDir = path.join(this.logDir, 'archive');
  }

  async initialize() {
    try {
      // Ensure directories exist
      await fs.mkdir(this.logDir, { recursive: true });
      await fs.mkdir(this.archiveDir, { recursive: true });

      // Create logs table if not exists
      await this.ensureLogsTable();

      // Start rotation schedule
      this.startRotationSchedule();

      console.log('✅ Log Rotation Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Log Rotation Service:', error);
    }
  }

  async ensureLogsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(20),
        message TEXT,
        category VARCHAR(50),
        data JSONB,
        user_id INTEGER,
        session_id VARCHAR(100),
        url TEXT,
        browser TEXT,
        error JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Index for faster queries
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    `;

    try {
      await db.query(createTableQuery);
    } catch (error) {
      console.error('Failed to create logs table:', error);
    }
  }

  startRotationSchedule() {
    // File rotation
    setInterval(() => {
      this.rotateLogFiles().catch(err => 
        console.error('File rotation error:', err)
      );
    }, this.config.rotationInterval);

    // Database cleanup
    setInterval(() => {
      this.cleanupDatabaseLogs().catch(err => 
        console.error('Database cleanup error:', err)
      );
    }, this.config.cleanupInterval);

    // Initial cleanup
    setTimeout(() => {
      this.rotateLogFiles().catch(console.error);
      this.cleanupDatabaseLogs().catch(console.error);
    }, 60000); // Run after 1 minute
  }

  async rotateLogFiles() {
    try {
      const logFile = path.join(this.logDir, 'combined.log');
      
      // Check if file exists and its size
      let stats;
      try {
        stats = await fs.stat(logFile);
      } catch (err) {
        // File doesn't exist yet
        return;
      }

      if (stats.size < this.config.maxFileSize) {
        return; // File is still small enough
      }

      console.log(`🔄 Rotating log file (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);

      // Generate timestamp for rotated file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = path.join(this.logDir, `combined-${timestamp}.log`);

      // Rename current log file
      await fs.rename(logFile, rotatedFile);

      // Compress rotated file if archive is enabled
      if (this.config.enableArchive) {
        await this.archiveLogFile(rotatedFile);
      }

      // Clean up old rotated files
      await this.cleanupOldLogFiles();

      console.log(`✅ Log file rotated: ${rotatedFile}`);
    } catch (error) {
      console.error('Error rotating log files:', error);
    }
  }

  async archiveLogFile(filePath) {
    try {
      const fileName = path.basename(filePath);
      const archivePath = path.join(this.archiveDir, fileName);

      // Move to archive directory
      await fs.rename(filePath, archivePath);

      console.log(`📦 Archived: ${fileName}`);
    } catch (error) {
      console.error('Error archiving log file:', error);
    }
  }

  async cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('combined-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f)
        }));

      // Sort by name (timestamp in name)
      logFiles.sort((a, b) => b.name.localeCompare(a.name));

      // Keep only maxFiles
      const filesToDelete = logFiles.slice(this.config.maxFiles);

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️ Deleted old log file: ${file.name}`);
      }

      // Clean up old archive files
      await this.cleanupOldArchiveFiles();
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }

  async cleanupOldArchiveFiles() {
    try {
      const files = await fs.readdir(this.archiveDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveOlderThanDays);

      for (const file of files) {
        const filePath = path.join(this.archiveDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old archive file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up archive files:', error);
    }
  }

  async cleanupDatabaseLogs() {
    try {
      // Get total log count
      const countResult = await db.query('SELECT COUNT(*) as count FROM logs');
      const totalLogs = parseInt(countResult.rows[0]?.count || 0);

      if (totalLogs === 0) {
        return;
      }

      console.log(`📊 Database has ${totalLogs} logs`);

      // Delete logs older than retention period
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.logRetentionDays);

      const deleteOldResult = await db.query(
        'DELETE FROM logs WHERE created_at < $1 RETURNING id',
        [retentionDate]
      );

      if (deleteOldResult.rowCount > 0) {
        console.log(`🗑️ Deleted ${deleteOldResult.rowCount} logs older than ${this.config.logRetentionDays} days`);
      }

      // If still over max, delete oldest logs
      const newCount = totalLogs - deleteOldResult.rowCount;
      if (newCount > this.config.maxDbLogs) {
        const excessLogs = newCount - this.config.maxDbLogs;
        
        const deleteExcessResult = await db.query(
          `DELETE FROM logs WHERE id IN (
            SELECT id FROM logs ORDER BY created_at ASC LIMIT $1
          ) RETURNING id`,
          [excessLogs]
        );

        console.log(`🗑️ Deleted ${deleteExcessResult.rowCount} excess logs to maintain limit`);
      }

      // Vacuum the table to reclaim space
      await db.query('VACUUM ANALYZE logs');
      console.log('✅ Database logs cleanup completed');

    } catch (error) {
      console.error('Error cleaning up database logs:', error);
    }
  }

  async getLogStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warn_count,
          MIN(created_at) as oldest_log,
          MAX(created_at) as newest_log,
          pg_size_pretty(pg_total_relation_size('logs')) as table_size
        FROM logs
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting log stats:', error);
      return null;
    }
  }

  async forceCleanup() {
    console.log('🔧 Force cleanup initiated');
    await this.rotateLogFiles();
    await this.cleanupDatabaseLogs();
    console.log('✅ Force cleanup completed');
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Log rotation config updated:', this.config);
  }
}

// Create singleton instance
const logRotationService = new LogRotationService();

module.exports = logRotationService;
