// models/Transaction.js — Defines what a "Transaction" document looks like in MongoDB
// Each transaction belongs to one user and records a single money movement

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // ref: 'User' tells Mongoose this field stores a User's _id
    // This is called a "reference" — it links two collections together
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // type must be one of these two exact strings — Mongoose will reject anything else
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be "income" or "expense".',
      },
      required: [true, 'Transaction type is required.'],
    },

    // amount must be a number; the min:0 check in the validator catches zero/negatives
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      // min with a custom message — Mongoose runs this automatically on save
      min: [0.01, 'Amount must be greater than 0.'],
    },

    category: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },

    // merchant is optional — it holds the shop/company name (e.g. "Swiggy", "Amazon")
    merchant: {
      type: String,
      trim: true,
    },

    // note is optional — any extra text the user wants to remember
    note: {
      type: String,
      trim: true,
    },

    // date defaults to now so users don't have to type it every time
    date: {
      type: Date,
      default: Date.now,
    },

    // source tells us HOW this transaction was added (typed by hand, from SMS, from CSV)
    source: {
      type: String,
      enum: ['manual', 'sms', 'csv'],
      default: 'manual',
    },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// --- Compound Index ---
// When we list a user's transactions, we always filter by "user" and sort by "date".
// This index tells MongoDB to pre-sort data by those two fields so queries run fast,
// even when there are thousands of records.
// -1 means descending (newest date first).
transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
