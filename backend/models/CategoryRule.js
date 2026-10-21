// models/CategoryRule.js — Stores a user's personal merchant-to-category mapping.
// When a user edits a transaction and changes its category, we save that choice here.
// Next time the same merchant appears, we use this saved rule instead of keyword matching.

const mongoose = require('mongoose');

const categoryRuleSchema = new mongoose.Schema(
  {
    // Which user this rule belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The merchant name stored in lowercase and trimmed so lookups are consistent.
    // e.g. "SWIGGY ORDER*123" becomes "swiggy order*123" for matching.
    merchantKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // The category this user chose for that merchant (must match categories.js)
    category: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    // Mongoose auto-adds createdAt and updatedAt — useful for debugging
    timestamps: true,
  }
);

// Unique compound index: one rule per user per merchant.
// This prevents duplicate rules and makes upserts safe.
categoryRuleSchema.index({ user: 1, merchantKey: 1 }, { unique: true });

module.exports = mongoose.model('CategoryRule', categoryRuleSchema);
