// routes/recurringRoutes.js — API endpoints for recurring payments & subscriptions
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getRecurring,
  getUpcoming,
  getSuggestions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} = require('../controllers/recurringController');

const router = express.Router();

// All recurring routes are protected
router.use(protect);

// GET /api/recurring — list all non-dismissed recurring items + monthly total
router.get('/', getRecurring);

// GET /api/recurring/upcoming — occurrences in the next N days (before /:id)
router.get('/upcoming', getUpcoming);

// GET /api/recurring/suggestions — detected recurring patterns from transactions (before /:id)
router.get('/suggestions', getSuggestions);

// POST /api/recurring — create a recurring reminder
router.post('/', createRecurring);

// PUT /api/recurring/:id — edit or change status (active/paused/dismissed)
router.put('/:id', updateRecurring);

// DELETE /api/recurring/:id — delete a recurring reminder
router.delete('/:id', deleteRecurring);

module.exports = router;
