// middleware/authMiddleware.js — Protects routes that require the user to be logged in
// Any route that calls this middleware will only work if a valid JWT is provided

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // JWTs are sent in the Authorization header, formatted as: "Bearer <token>"
  // We check the header exists and starts with "Bearer"
  const authHeader = req.headers.authorization;
  const hasToken = authHeader && authHeader.startsWith('Bearer ');

  if (!hasToken) {
    // No token means the request is not authenticated — reject it immediately
    return res.status(401).json({ success: false, message: 'Not authorised. No token provided.' });
  }

  // The token is the part after "Bearer " — we split on the space and take index 1
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks the token's signature using JWT_SECRET
    // If the token was tampered with or expired, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded.id is the user ID we stored when we created the token (see authController)
    // We fetch the user from the database and attach it to the request object
    // .select('-passwordHash') tells Mongoose to leave out the password hash from the result
    req.user = await User.findById(decoded.id).select('-passwordHash');

    if (!req.user) {
      // The token was valid but the user was deleted from the database
      return res.status(401).json({ success: false, message: 'Not authorised. User no longer exists.' });
    }

    // Everything is fine — pass control to the next function (the actual route handler)
    next();
  } catch (error) {
    // jwt.verify threw an error — the token is invalid or expired
    return res.status(401).json({ success: false, message: 'Not authorised. Token is invalid or expired.' });
  }
};

module.exports = { protect };
