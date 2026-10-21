// db.js — Handles the connection to MongoDB
// We keep this in a separate file so server.js stays clean and focused

const mongoose = require('mongoose');

// connectDB is an async function because mongoose.connect() takes time (network call)
const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise, so we await it
    // MONGO_URI comes from the .env file — never hardcoded here
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // conn.connection.host tells us which server we connected to (helpful for debugging)
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, print a clear error so we know what went wrong
    console.error(`MongoDB connection failed: ${error.message}`);

    // Exit the process entirely — the app cannot work without the database
    process.exit(1);
  }
};

module.exports = connectDB;
