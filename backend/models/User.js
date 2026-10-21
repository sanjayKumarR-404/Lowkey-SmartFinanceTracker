// models/User.js — Defines what a "User" document looks like in MongoDB
// Mongoose uses this schema to validate and structure data before saving

const mongoose = require('mongoose');

// A schema is like a blueprint — it says what fields a user document must have
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'], // Mongoose will reject saves without a name
      trim: true,                            // Removes accidental leading/trailing spaces
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,      // MongoDB will reject a second user with the same email
      lowercase: true,   // Always store emails in lowercase so "User@Mail.com" and
                         // "user@mail.com" are treated as the same address
      trim: true,
    },

    // We NEVER store the raw password — only the bcrypt hash of it
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    // timestamps: true tells Mongoose to automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

// Export the model so controllers can use it to create/find/update users
module.exports = mongoose.model('User', userSchema);
