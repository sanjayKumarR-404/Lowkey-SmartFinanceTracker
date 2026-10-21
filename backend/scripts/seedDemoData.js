// scripts/seedDemoData.js — Generates ~120 realistic demo transactions for testing the Dashboard.
// Run with: npm run seed:demo -- someone@email.com
// Options:   --reset  deletes that user's demo transactions first (safe to re-run)
//
// SAFETY: this script refuses to run in production to avoid polluting real data.

const path = require('path');
// Load .env from the repo root (one level above /backend)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Block production runs immediately
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed:demo must not run in production. Exiting.');
  process.exit(1);
}

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');

// --- Parse CLI arguments ---
// argv looks like: ["node", "seedDemoData.js", "someone@email.com", "--reset"]
const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'));
const shouldReset = args.includes('--reset');

if (!email) {
  console.error('Usage: npm run seed:demo -- someone@email.com [--reset]');
  process.exit(1);
}

// 6 sensible demo budgets for Indian living expenses
const DEMO_BUDGETS = [
  { category: 'Food & dining', amount: 5000 },
  { category: 'Groceries', amount: 6500 },
  { category: 'Transport', amount: 2500 },
  { category: 'Shopping', amount: 4000 },
  { category: 'Bills & utilities', amount: 3000 },
  { category: 'Entertainment', amount: 2000 },
];

// --- Merchant pools by category (realistic Indian names) ---
const merchantsByCategory = {
  'Food & dining': ['Swiggy', 'Zomato', 'McDonald\'s', 'Domino\'s', 'Starbucks', 'Cafe Coffee Day', 'KFC'],
  'Groceries':     ['BigBasket', 'Blinkit', 'Zepto', 'D-Mart', 'Reliance Smart', 'More Supermarket'],
  'Transport':     ['Uber', 'Ola', 'Rapido', 'BMTC', 'Auto', 'InDrive'],
  'Shopping':      ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Nykaa', 'Ajio'],
  'Bills & utilities': ['BESCOM', 'Airtel', 'Jio', 'BWSSB', 'Piped Gas', 'Electricity Board'],
  'Rent':          ['House Rent'],
  'Entertainment': ['Netflix', 'Prime Video', 'Hotstar', 'BookMyShow', 'PVR Cinemas'],
  'Health':        ['Apollo Pharmacy', 'MedPlus', 'PharmEasy', 'Manipal Hospital', 'Netmeds'],
  'Education':     ['Coursera', 'Udemy', 'NPTEL', 'College Fees'],
  'Travel':        ['MakeMyTrip', 'IRCTC', 'Ola Outstation', 'Goibibo'],
  'Subscriptions': ['Spotify', 'YouTube Premium', 'iCloud', 'Notion'],
  'Salary':        ['Employer'],
  'Other':         ['ATM Withdrawal', 'Petrol Pump', 'Medical'],
};

// Spending ranges: [min, max] in INR — kept realistic for an Indian student/early career
const rangeByCategory = {
  'Food & dining':    [80, 600],
  'Groceries':        [200, 2500],
  'Transport':        [30, 400],
  'Shopping':         [299, 3000],
  'Bills & utilities':[200, 1500],
  'Rent':             [8000, 15000],
  'Entertainment':    [100, 700],
  'Health':           [100, 2000],
  'Education':        [500, 5000],
  'Travel':           [500, 5000],
  'Subscriptions':    [99, 699],
  'Salary':           [40000, 60000],
  'Other':            [200, 1500],
};

function rand(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate one transaction object (not saved yet).
 * @param {string} userId
 * @param {Date} date
 * @param {'income'|'expense'} type
 * @param {string} category
 */
function makeTransaction(userId, date, type, category) {
  const [min, max] = rangeByCategory[category] || [100, 1000];
  const merchants = merchantsByCategory[category] || ['Merchant'];
  return {
    user: userId,
    type,
    amount: rand(min, max),
    category,
    merchant: pick(merchants),
    note: 'demo data', // flag so --reset can identify and remove these safely
    date,
    source: 'manual',
  };
}

/**
 * Build a list of ~120 transactions spread across the last 6 months.
 * The pattern includes: monthly salary, rent, weekly groceries/food/transport,
 * occasional subscriptions, utilities, and random impulse spending.
 */
function buildTransactions(userId) {
  const txns = [];
  const now = new Date();

  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    // The 1st of the target month
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const y = targetMonth.getFullYear();
    const m = targetMonth.getMonth(); // 0-indexed

    // Salary — 1st or 2nd of month
    txns.push(makeTransaction(userId, new Date(y, m, rand(1, 2)), 'income', 'Salary'));

    // Rent — 1st–5th
    txns.push(makeTransaction(userId, new Date(y, m, rand(1, 5)), 'expense', 'Rent'));

    // Utilities — mid month
    txns.push(makeTransaction(userId, new Date(y, m, rand(10, 15)), 'expense', 'Bills & utilities'));
    txns.push(makeTransaction(userId, new Date(y, m, rand(16, 20)), 'expense', 'Bills & utilities'));

    // Subscriptions — start of month
    txns.push(makeTransaction(userId, new Date(y, m, rand(1, 7)), 'expense', 'Subscriptions'));
    txns.push(makeTransaction(userId, new Date(y, m, rand(1, 7)), 'expense', 'Subscriptions'));

    // Weekly groceries (4 times a month)
    for (let week = 0; week < 4; week++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(week * 7 + 1, week * 7 + 7)), 'expense', 'Groceries'));
    }

    // Food delivery — 5–7 times
    const foodCount = rand(5, 7);
    for (let i = 0; i < foodCount; i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Food & dining'));
    }

    // Transport — 6–9 times
    const transportCount = rand(6, 9);
    for (let i = 0; i < transportCount; i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Transport'));
    }

    // Shopping — 1–3 orders
    const shopCount = rand(1, 3);
    for (let i = 0; i < shopCount; i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Shopping'));
    }

    // Health — occasionally (0–2)
    const healthCount = rand(0, 2);
    for (let i = 0; i < healthCount; i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Health'));
    }

    // Entertainment — 1–2 times
    const entCount = rand(1, 2);
    for (let i = 0; i < entCount; i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Entertainment'));
    }

    // Travel — randomly once every 2 months
    if (Math.random() > 0.5) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(10, 25)), 'expense', 'Travel'));
    }

    // Petrol / other misc — 1–2
    for (let i = 0; i < rand(1, 2); i++) {
      txns.push(makeTransaction(userId, new Date(y, m, rand(1, 28)), 'expense', 'Other'));
    }
  }

  return txns;
}

// --- Main ---
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Find the user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  console.log(`Found user: ${user.name} (${user.email})`);

  // --reset: delete only this user's demo transactions and budgets first
  if (shouldReset) {
    const deletedTxns = await Transaction.deleteMany({ user: user._id, note: 'demo data' });
    console.log(`Removed ${deletedTxns.deletedCount} existing demo transactions.`);

    const deletedBudgets = await Budget.deleteMany({ user: user._id });
    console.log(`Removed ${deletedBudgets.deletedCount} existing budgets.`);
  }

  const txns = buildTransactions(user._id);
  await Transaction.insertMany(txns);
  console.log(`Inserted ${txns.length} demo transactions for ${user.email}.`);

  // After creating transactions, also create budgets for 6 sensible categories (skip any that already exist)
  const existingBudgets = await Budget.find({ user: user._id });
  const existingCatSet = new Set(existingBudgets.map((b) => b.category));
  const budgetsToInsert = [];

  for (const b of DEMO_BUDGETS) {
    if (!existingCatSet.has(b.category)) {
      budgetsToInsert.push({
        user: user._id,
        category: b.category,
        amount: b.amount,
      });
    }
  }

  if (budgetsToInsert.length > 0) {
    await Budget.insertMany(budgetsToInsert);
    console.log(`Inserted ${budgetsToInsert.length} demo budgets for ${user.email}.`);
  }

  await mongoose.disconnect();
  console.log('Done. MongoDB disconnected.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
