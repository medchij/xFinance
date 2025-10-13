/**
 * Frontend Logger - Browser compatible logging utility
 */
import { BASE_URL } from "../../config";

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Maximum number of logs to keep in memory
    this.logLevel = 'info'; // Default log level
    this.remoteLevels = new Set(["error", "warn", "info"]); // Levels to send to backend
  // Use shared BASE_URL (dev: http://localhost:4000), or injected value, else relative
  // eslint-disable-next-line no-undef
  const injectedBase = (typeof globalThis !== "undefined" && globalThis.__API_BASE__) ? globalThis.__API_BASE__ : "";
  this.apiBase = (BASE_URL && BASE_URL.trim()) || injectedBase || "";
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

  // Configure which levels go to backend
  setRemoteLevels(levels = ["error", "warn", "info"]) {
    this.remoteLevels = new Set(levels.map((l) => String(l).toLowerCase()));
  }

  setApiBase(base) {
    this.apiBase = base || "";
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
      data,
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
      const levelLower = String(logEntry.level || '').toLowerCase();
      if (this.remoteLevels.has(levelLower)) {
            const url = `${this.apiBase}/api/logs`;
        const response = await fetch(url, {
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

  // Extra helper used by apiHelpers.js
  apiResponse(url, status, extra = {}) {
    try {
      const msg = `HTTP ${status} - ${url}`;
      const entry = this.formatMessage('info', msg, extra);
      // Print to console at info level
      // eslint-disable-next-line no-console
      console.info(`[${entry.timestamp}] HTTP: ${status} ${url}`);
      // Send to backend based on level policy
      this.sendToBackend(entry);
    } catch (e) {
      // ignore to avoid cascading errors
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export default instance
export default logger;

// Also export the Logger class for custom instances
export { Logger };