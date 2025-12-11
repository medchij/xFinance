/**
 * Frontend Logger - Browser compatible logging utility
 */
import { BASE_URL } from "../../config";
import { getAuthToken } from "../../config/token";

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
    // Азийн цагийн бүс (+8) ашиглан DD.MM.YYYY HH:mm:ss форматаар
    const now = new Date();
    const asiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const day = String(asiaTime.getUTCDate()).padStart(2, '0');
    const month = String(asiaTime.getUTCMonth() + 1).padStart(2, '0');
    const year = asiaTime.getUTCFullYear();
    const hours = String(asiaTime.getUTCHours()).padStart(2, '0');
    const minutes = String(asiaTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(asiaTime.getUTCSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data,
      // Browser environment info
      browser: navigator.userAgent,
      url: window.location.href,
      // Session info
      sessionId: sessionStorage.getItem('sessionId') || 'unknown'
    };

    // Error object бол stack trace нэмэх
    if (data instanceof Error) {
      logEntry.error = {
        name: data.name,
        message: data.message,
        stack: data.stack,
        cause: data.cause
      };
      logEntry.data = null; // Error-ийг error field-д шилжүүлсэн
    }
    // Error-тэй object бол stack авах
    else if (data && typeof data === 'object' && data.error instanceof Error) {
      logEntry.error = {
        name: data.error.name,
        message: data.error.message,
        stack: data.error.stack,
        cause: data.error.cause
      };
      // data-аас error-ийг салгаж бусад мэдээллийг үлдээх
      const { error, ...restData } = data;
      logEntry.data = Object.keys(restData).length > 0 ? restData : null;
    }

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
        console.log("Sending log to backend:", url, logEntry);
  const token = getAuthToken();
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify(logEntry),
        });

        if (!response.ok) {
          console.warn("Failed to send log to backend:", response.statusText);
        } else {
          console.log("Log sent successfully to backend");
        }
      }
    } catch (error) {
      // Don't log this error to avoid infinite loops
      console.warn("Backend logging failed:", error.message);
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
    return this.logs.filter((log) => log.level === level.toUpperCase());
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
      const entry = this.formatMessage("info", msg, extra);
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

// Global error handlers - бүх catch хийгдээгүй алдааг барих
if (typeof window !== 'undefined') {
  // Unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    logger.error('Uncaught Error', {
      error: event.error,
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      error: event.reason,
      promise: String(event.promise)
    });
  });

  // React error boundary дээрээс ирэх алдаа
  window.logReactError = (error, errorInfo) => {
    logger.error('React Component Error', {
      error: error,
      componentStack: errorInfo?.componentStack
    });
  };
}

// Export default instance
export default logger;

// Also export the Logger class for custom instances
export { Logger };
