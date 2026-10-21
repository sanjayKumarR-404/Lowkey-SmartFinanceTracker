// controllers/authController.js — Handles register, login, and getMe
// A controller is just a group of functions that run when a route is hit

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Helper: create a JWT for a user ---
// We put this in a helper function so both register and login can use the same logic
const createToken = (userId) => {
  // jwt.sign() creates a token containing the user's ID
  // The token is signed with JWT_SECRET so the server can verify it later
  // JWT_EXPIRES_IN (e.g. "7d") controls how long the token stays valid
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// --- Helper: basic email format check ---
// We use a simple regex instead of a library to keep things easy to understand
// A regex (regular expression) is a pattern matcher — this one checks for "x@y.z"
const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// ---------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // --- Input Validation ---
    // Check that all three fields were sent in the request body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    // Check the email looks like a real email address
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Passwords shorter than 8 characters are too easy to guess
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // Check if someone already registered with this email
    // We compare in lowercase because we store emails in lowercase
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // --- Hash the password ---
    // bcrypt.hash() scrambles the password into a fixed-length string (the "hash")
    // The number 12 is the "salt rounds" — higher means more secure but slower
    // 12 is a good balance for a web app
    const passwordHash = await bcrypt.hash(password, 12);

    // --- Save the user to the database ---
    // We store the hash, NOT the original password — the original is thrown away
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    // --- Create a JWT for the newly registered user ---
    // This lets them be "logged in" immediately after registering
    const token = createToken(user._id);

    // Send back the token and the user's public info (never send passwordHash)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    // Pass any unexpected error to the central error handler in errorHandler.js
    next(error);
  }
};

// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // --- Input Validation ---
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    // Find the user by email (stored in lowercase)
    const user = await User.findOne({ email: email.toLowerCase() });

    // We use the SAME error message whether the email is wrong or the password is wrong
    // This is intentional — it prevents an attacker from discovering which emails are registered
    const genericErrorMessage = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ success: false, message: genericErrorMessage });
    }

    // --- Check the password ---
    // bcrypt.compare() hashes the provided password and checks if it matches the stored hash
    // It returns true if they match, false if not
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      // Same message as above — we do not reveal which of the two was wrong
      return res.status(401).json({ success: false, message: genericErrorMessage });
    }

    // Password is correct — create a JWT and send it back
    const token = createToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/auth/me  (protected — requires a valid JWT)
// ---------------------------------------------------------------
const getMe = async (req, res) => {
  // The authMiddleware (protect) already found the user and attached them to req.user
  // We just send that user data back — no need to query the DB again
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
    },
  });
};

module.exports = { register, login, getMe };
