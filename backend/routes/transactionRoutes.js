// routes/transactionRoutes.js — Maps URLs to transaction controller functions
// All routes here require the user to be logged in (protected by authMiddleware)

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  parseSmsMessage,
  getTransactionSummary,
  suggestCategory,
  recategorizeTransactions,
} = require('../controllers/transactionController');

const router = express.Router();

// Apply "protect" middleware to EVERY route in this file using router.use()
// This means every request must carry a valid JWT — no exceptions
// It's cleaner than writing "protect," in every single route line below
router.use(protect);

// POST   /api/transactions/parse-sms — parse bank SMS without saving
router.post('/parse-sms', parseSmsMessage);

// GET    /api/transactions/summary   — aggregate monthly totals (placed before /:id)
router.get('/summary', getTransactionSummary);

// GET    /api/transactions/suggest-category — suggest category from rules or keywords (placed before /:id)
router.get('/suggest-category', suggestCategory);

// POST   /api/transactions/recategorize — bulk update category by merchant (placed before /:id)
router.post('/recategorize', recategorizeTransactions);

// POST   /api/transactions        — add a new transaction
router.post('/', createTransaction);

// GET    /api/transactions        — list all my transactions (with optional filters)
router.get('/', getTransactions);

// PUT    /api/transactions/:id    — update one transaction by its ID
router.put('/:id', updateTransaction);

// DELETE /api/transactions/:id    — delete one transaction by its ID
router.delete('/:id', deleteTransaction);

module.exports = router;
