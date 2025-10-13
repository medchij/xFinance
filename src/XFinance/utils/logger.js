/**
 * Frontend Logger - Browser compatible logging utility
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Maximum number of logs to keep in memory
    this.logLevel = 'info'; // Default log level
  }

  // Log levels
  static LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
  };

  setLogLevel(level) {
    this.logLevel = level;
  }

  shouldLog(level) {
    return Logger.LEVELS[level] <= Logger.LEVELS[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };

    // Keep logs in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    return logEntry;
  }

  error(message, data = null) {
    if (!this.shouldLog('error')) return;
    
    const logEntry = this.formatMessage('error', message, data);
    console.error(`[${logEntry.timestamp}] ERROR: ${message}`, data || '');
    
    // Send to backend if available
    this.sendToBackend(logEntry);
  }

  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const logEntry = this.formatMessage('warn', message, data);
    console.warn(`[${logEntry.timestamp}] WARN: ${message}`, data || '');
    
    this.sendToBackend(logEntry);
  }

  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const logEntry = this.formatMessage('info', message, data);
    console.info(`[${logEntry.timestamp}] INFO: ${message}`, data || '');
    
    this.sendToBackend(logEntry);
  }

  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const logEntry = this.formatMessage('debug', message, data);
    console.debug(`[${logEntry.timestamp}] DEBUG: ${message}`, data || '');
    
    this.sendToBackend(logEntry);
  }

  trace(message, data = null) {
    if (!this.shouldLog('trace')) return;
    
    const logEntry = this.formatMessage('trace', message, data);
    console.trace(`[${logEntry.timestamp}] TRACE: ${message}`, data || '');
    
    this.sendToBackend(logEntry);
  }

  // Send log to backend server
  async sendToBackend(logEntry) {
    try {
      // Only send important logs to backend (error, warn)
      if (logEntry.level === 'ERROR' || logEntry.level === 'WARN') {
        const response = await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry)
        });
        
        if (!response.ok) {
          console.warn('Failed to send log to backend:', response.statusText);
        }
      }
    } catch (error) {
      // Don't log this error to avoid infinite loops
      console.warn('Backend logging failed:', error.message);
    }
  }

  // Get all logs
  getLogs() {
    return [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Get logs by level
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level.toUpperCase());
  }

  // Get recent logs
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  // Export logs as JSON
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
const logger = new Logger();

// Export default instance
export default logger;

// Also export the Logger class for custom instances
export { Logger };