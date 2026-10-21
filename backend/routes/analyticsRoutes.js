// routes/analyticsRoutes.js — Analytics API routes, all protected by auth
const express = require('express');
const router = express.Router();
const { getOverview } = require('../controllers/analyticsController');
const protect = require('../middleware/authMiddleware');

// GET /api/analytics/overview?month=10&year=2026
// Returns a full month snapshot: summary, trend, categories, merchants, recent
router.get('/overview', protect, getOverview);

module.exports = router;
