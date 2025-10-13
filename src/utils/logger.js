/**
 * Frontend Logger Utility - Browser-based logging
 * Монгол хэл дэмжтэй лог систем
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(level = LOG_LEVELS.INFO) {
    this.level = level;
    this.colors = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4444ff; font-weight: bold;',
      debug: 'color: #888888;',
      success: 'color: #44ff44; font-weight: bold;'
    };
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toLocaleString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };
  }

  logToConsole(level, message, data = null) {
    const formatted = this.formatMessage(level, message, data);
    const logMessage = `[${formatted.timestamp}] [${formatted.level}] ${formatted.message}`;
    
    if (data) {
      console.group(`%c${logMessage}`, this.colors[level]);
      console.log(data);
      console.groupEnd();
    } else {
      console.log(`%c${logMessage}`, this.colors[level]);
    }
  }

  // Local Storage-д хадгалах (хязгаартай)
  saveToLocalStorage(level, message, data) {
    try {
      const logs = JSON.parse(localStorage.getItem('xfinance_logs') || '[]');
      const logEntry = {
        ...this.formatMessage(level, message, data),
        id: Date.now()
      };
      
      logs.push(logEntry);
      
      // Хамгийн сүүлийн 100 логийг хадгалах
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('xfinance_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Local Storage-д лог хадгалж чадсангүй:', e);
    }
  }

  error(message, data = null) {
    if (this.level >= LOG_LEVELS.ERROR) {
      this.logToConsole('error', message, data);
      this.saveToLocalStorage('error', message, data);
    }
  }

  warn(message, data = null) {
    if (this.level >= LOG_LEVELS.WARN) {
      this.logToConsole('warn', message, data);
      this.saveToLocalStorage('warn', message, data);
    }
  }

  info(message, data = null) {
    if (this.level >= LOG_LEVELS.INFO) {
      this.logToConsole('info', message, data);
      this.saveToLocalStorage('info', message, data);
    }
  }

  debug(message, data = null) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      this.logToConsole('debug', message, data);
      this.saveToLocalStorage('debug', message, data);
    }
  }

  success(message, data = null) {
    this.logToConsole('success', message, data);
    this.saveToLocalStorage('info', `✅ ${message}`, data);
  }

  // API хүсэлт/хариу логлох тусгай функц
  apiRequest(method, url, requestData = null) {
    this.info(`🌐 API Хүсэлт: ${method} ${url}`, requestData);
  }

  apiResponse(url, status, responseData = null) {
    if (status >= 200 && status < 300) {
      this.success(`API Хариу: ${url} - ${status}`, responseData);
    } else {
      this.error(`❌ API Алдаа: ${url} - ${status}`, responseData);
    }
  }

  // Excel/Office операций лог
  excelOperation(operation, details = null) {
    this.info(`📊 Excel: ${operation}`, details);
  }

  // Хэрэглэгчийн үйлдэл лог
  userAction(action, userId = null, details = null) {
    this.info(`👤 Хэрэглэгч: ${action}${userId ? ` (ID: ${userId})` : ''}`, details);
  }

  // Локал стораж дахь логуудыг авах
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('xfinance_logs') || '[]');
    } catch (e) {
      console.warn('Логуудыг уншиж чадсангүй:', e);
      return [];
    }
  }

  // Логуудыг цэвэрлэх
  clearLogs() {
    localStorage.removeItem('xfinance_logs');
    this.info('Логууд цэвэрлэгдлээ');
  }

  // Логуудыг экспорт хийх
  exportLogs() {
    const logs = this.getLogs();
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xfinance-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.info('Логууд экспорт хийгдлээ');
  }
}

// Default logger instance
const logger = new Logger(
  process?.env?.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO
);

export default logger;
export { Logger, LOG_LEVELS };