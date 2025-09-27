const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize database connection (and test it)
require('./db.js');

const app = express();

// Middleware
// Enable CORS for all routes, allowing frontend to connect
app.use(cors()); 
// Parse incoming JSON requests
app.use(express.json()); 

// Test route to check if the server is running
app.get('/', (req, res) => {
  res.send('xFinance Express.js backend server is running!');
});

// API Routes
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


const PORT = process.env.BACKEND_PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});
