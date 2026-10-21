// healthRoutes.js — A simple route to check if the server is running
// Useful for testing that the API is reachable before building real features

const express = require('express');
const router = express.Router();

// GET /api/health — returns { status: "ok" } if the server is up
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
