// routes/authRoutes.js — Maps URLs to the correct controller functions
// Also applies a rate limiter so the register and login endpoints can't be spammed

const express = require('express');
const rateLimit = require('express-rate-limit');

const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Rate Limiter ---
// This blocks a single IP address if it sends more than 10 requests in 15 minutes
// to the register or login endpoints. This helps prevent brute-force attacks
// (someone trying thousands of passwords automatically).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 10,                   // maximum 10 requests per window per IP
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again after 15 minutes.',
  },
  // standardHeaders: true adds rate limit info to response headers (X-RateLimit-*)
  standardHeaders: true,
  // legacyHeaders: false removes the older X-RateLimit-* headers that some libraries send
  legacyHeaders: false,
});

// POST /api/auth/register — Create a new account
// authLimiter runs before register — if the limit is exceeded, register never runs
router.post('/register', authLimiter, register);

// POST /api/auth/login — Log in with an existing account
router.post('/login', authLimiter, login);

// GET /api/auth/me — Get the currently logged-in user's info
// protect runs before getMe — if the JWT is missing or invalid, getMe never runs
router.get('/me', protect, getMe);

module.exports = router;
