const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { logger, requestLogger, logAPI } = require('./logger');

// Load environment variables from .env.local file in the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize database connection (and test it)
require('./db.js');

const app = express();

// Middleware
app.use(requestLogger); // Logging middleware эхлээд
app.use(cors()); 
app.use(express.json()); 

// Test route to check if the server is running
app.get('/api', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.send('xFinance Express.js backend server is running!');
});

// Root route
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.json({
    message: 'xFinance Backend Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});


// API Routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const settingsRouter = require('./routes/settings');
app.use('/api/settings', settingsRouter);

const companiesRouter = require('./routes/companies');
app.use('/api/companies', companiesRouter);

const customerRouter = require('./routes/customer');
app.use('/api/customer', customerRouter);

const accountRouter = require('./routes/account');
app.use('/api/account', accountRouter);

const cfRouter = require('./routes/cf');
app.use('/api/cf', cfRouter);

const pingRouter = require('./routes/ping');
app.use('/api/ping', pingRouter);

const envRouter = require('./routes/env');
app.use('/api/env', envRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const groupsRouter = require('./routes/groups');
app.use('/api/groups', groupsRouter);

const rolesRouter = require('./routes/roles');
app.use('/api/roles', rolesRouter);

const permissionsRouter = require('./routes/permissions');
app.use('/api/permissions', permissionsRouter);

const logsRouter = require('./routes/logs');
app.use('/api/logs', logsRouter);


// Export the app for Vercel
module.exports = app;

// Start the server for local development
const PORT = process.env.BACKEND_PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server is running on http://0.0.0.0:${PORT}`);
});
