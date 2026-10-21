// models/Recurring.js — Mongoose model for recurring income & expense reminders
// Tracks repeating payments (subscriptions, bills, rent, salary) for reminders and forecasts.
// Note: Recurring items are forecasts/reminders only — they do NOT auto-create transactions.

const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema(
  {
    // The user who owns this recurring reminder
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Descriptive name (e.g. "Netflix", "House Rent", "Internet Bill")
    name: {
      type: String,
      required: [true, 'Recurring payment name is required.'],
      trim: true,
    },

    // Whether this is an incoming credit or outgoing debit
    type: {
      type: String,
      required: true,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be either "income" or "expense".',
      },
    },

    // Amount per occurrence in INR
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [1, 'Amount must be greater than 0.'],
    },

    // Category from categories.js
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },

    // Frequency of repetition
    frequency: {
      type: String,
      required: true,
      enum: {
        values: ['weekly', 'monthly', 'yearly'],
        message: 'Frequency must be "weekly", "monthly", or "yearly".',
      },
    },

    // Next scheduled payment or credit date
    nextDate: {
      type: Date,
      required: [true, 'Next date is required.'],
    },

    // Status: active (reminders on), paused (temporarily stopped), dismissed (user rejected detector)
    status: {
      type: String,
      enum: ['active', 'paused', 'dismissed'],
      default: 'active',
    },

    // Origin of this rule
    source: {
      type: String,
      enum: ['manual', 'detected'],
      default: 'manual',
    },

    // Normalized lowercase merchant name for matching detector suggestions
    merchantKey: {
      type: String,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch active/paused items for a user
recurringSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Recurring', recurringSchema);
