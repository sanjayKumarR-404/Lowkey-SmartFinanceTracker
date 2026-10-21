// routes/budgetRoutes.js — Routes for monthly category budgets
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getBudgets,
  getBudgetSuggestions,
  createOrUpdateBudget,
  deleteBudget,
} = require('../controllers/budgetController');

const router = express.Router();

// All budget routes are protected
router.use(protect);

// GET /api/budgets — list budgets with spending & progress for a month
router.get('/', getBudgets);

// GET /api/budgets/suggestions — suggest limits based on previous 3-month averages (must be before /:id)
router.get('/suggestions', getBudgetSuggestions);

// POST /api/budgets — create or update (upsert) a category budget
router.post('/', createOrUpdateBudget);

// DELETE /api/budgets/:id — delete a category budget
router.delete('/:id', deleteBudget);

module.exports = router;
