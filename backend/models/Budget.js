// models/Budget.js — Mongoose model for category monthly budgets
// A budget defines a monthly spending ceiling for a specific expense category.
// Budgets apply across every month (limits are monthly targets).

const mongoose = require('mongoose');

const BUDGET_CATEGORIES = [
  'Food & dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Rent',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Subscriptions',
  'Transfers',
  'Other',
];

const budgetSchema = new mongoose.Schema(
  {
    // The user who owns this budget
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Category must be one of the allowed expense categories (never Salary)
    category: {
      type: String,
      required: true,
      trim: true,
      enum: {
        values: BUDGET_CATEGORIES,
        message: '{VALUE} is not an allowed budget category.',
      },
    },

    // Monthly spending limit in INR (must be positive number)
    amount: {
      type: Number,
      required: true,
      min: [1, 'Budget amount must be greater than 0.'],
    },
  },
  {
    // Auto-manage createdAt and updatedAt
    timestamps: true,
  }
);

// One budget per category per user
budgetSchema.index({ user: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
