// server.js — The main entry point for the Express backend
// This file wires everything together: loads env variables, connects to DB,
// registers middleware, mounts routes, and starts listening for requests.

// path is a built-in Node.js module — we use it to build file paths safely
const path = require('path');

// Load environment variables FIRST, before anything else
// The .env file lives in the repo root (one level above /backend),
// so we use path.resolve(__dirname, '..', '.env') to point there
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB before starting the server
connectDB();

const app = express();

// --- Middleware ---
// helmet adds security-related HTTP headers automatically
app.use(helmet());

// cors allows the React frontend (on a different port) to call this API
app.use(cors());

// morgan logs every incoming request to the console (e.g. "GET /api/health 200 3ms")
// 'dev' format is colourful and easy to read during development
app.use(morgan('dev'));

// express.json() lets us read JSON bodies from POST/PUT requests
app.use(express.json());

// --- Routes ---
// All our routes are prefixed with /api to keep things organised
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);           // register, login, getMe
app.use('/api/transactions', transactionRoutes); // create, list, update, delete
app.use('/api/analytics', analyticsRoutes);      // dashboard overview
app.use('/api/budgets', budgetRoutes);          // category monthly budgets
app.use('/api/recurring', recurringRoutes);      // recurring payments & reminders

// --- Error Handling ---
// notFound must come AFTER all routes — it catches anything that didn't match
app.use(notFound);

// errorHandler must be the very last middleware — Express knows it's an error
// handler because it has 4 parameters (err, req, res, next)
app.use(errorHandler);

// --- Start Server ---
// Read PORT from .env; fall back to 5000 if the variable is not set
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
