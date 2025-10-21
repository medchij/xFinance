const winston = require('winston');
const path = require('path');

// Лог файлуудын байршил
const logDir = path.join(__dirname, 'logs');

// Winston logger тохиргоо
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => {
        // Азийн цагийн бүс (+8) ашиглан DD.MM.YYYY HH:mm:ss форматаар
        const now = new Date();
        const asiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const day = String(asiaTime.getUTCDate()).padStart(2, '0');
        const month = String(asiaTime.getUTCMonth() + 1).padStart(2, '0');
        const year = asiaTime.getUTCFullYear();
        const hours = String(asiaTime.getUTCHours()).padStart(2, '0');
        const minutes = String(asiaTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(asiaTime.getUTCSeconds()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
      }
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'xfinance-backend' },
  transports: [
    // Алдааны логийг файлд хадгалах
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Бүх логийг нэгтгэсэн файл
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log',),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Development орчинд console логийг нэмэх
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Express middleware үүсгэх
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Хэрэглэгчийн мэдээллийг JWT token-оос авах
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      user = decoded.username || decoded.email || decoded.id;
    } catch (err) {
      // JWT invalid эсвэл expired
    }
  }
  
  // Request логлох
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    user: user || 'anonymous', // Хэрэглэгчийн нэр нэмэх
    body: req.method === 'POST' || req.method === 'PUT' ? 
      sanitizeBody(req.body) : undefined
  });

  // Response логлох
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: user || 'anonymous', // Хэрэглэгчийн нэр нэмэх
      contentLength: res.get('Content-Length')
    });

    if (res.statusCode >= 400) {
      logger.error('HTTP Error Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        error: data
      });
    }

    originalSend.call(this, data);
  };

  next();
};

// Сенситив датаг нуух
function sanitizeBody(body) {
  if (!body) return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[HIDDEN]';
    }
  });
  
  return sanitized;
}

// Лог функцууд
const logAPI = {
  request: (method, url, data) => {
    logger.info('API Request', { method, url, data: sanitizeBody(data) });
  },
  
  response: (method, url, statusCode, data) => {
    if (statusCode >= 200 && statusCode < 300) {
      logger.info('API Success', { method, url, statusCode });
    } else {
      logger.error('API Error', { method, url, statusCode, error: data });
    }
  },
  
  database: (operation, table, data) => {
    logger.info('Database Operation', { operation, table, data });
  },
  
  auth: (action, userId, success) => {
    logger.info('Authentication', { action, userId, success });
  },
  
  error: (error, context) => {
    logger.error('Application Error', { 
      message: error.message,
      stack: error.stack,
      context 
    });
  }
};

module.exports = { logger, requestLogger, logAPI };