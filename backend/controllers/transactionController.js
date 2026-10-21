// controllers/transactionController.js — Handles all CRUD for transactions
// CRUD = Create, Read, Update, Delete — the four basic database operations

const Transaction = require('../models/Transaction');
const { parseSms } = require('../utils/smsParser');

// ---------------------------------------------------------------
// Helper: validate fields that come in from the request body
// Returns an error message string if something is wrong, or null if everything is fine
// We keep this as a helper so we don't repeat the same checks in create and update
// ---------------------------------------------------------------
const validateTransactionInput = (body) => {
  const { type, amount, date } = body;

  // Check type is exactly "income" or "expense"
  if (type !== undefined) {
    if (type !== 'income' && type !== 'expense') {
      return 'Type must be "income" or "expense".';
    }
  }

  // Check amount is a real number greater than zero
  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return 'Amount must be a positive number greater than 0.';
    }
  }

  // Check date is a real date (Date.parse returns NaN for invalid strings)
  if (date !== undefined) {
    if (isNaN(Date.parse(date))) {
      return 'Date must be a valid date (e.g. "2026-10-21").';
    }
  }

  // null means no error — all checks passed
  return null;
};

// ---------------------------------------------------------------
// POST /api/transactions — Create a new transaction
// ---------------------------------------------------------------
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, merchant, note, date, source } = req.body;

    // type and amount are required for creating a transaction
    if (!type || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide type and amount.' });
    }

    // Run our validation helper
    const validationError = validateTransactionInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // req.user._id comes from the authMiddleware — it's the logged-in user's ID
    // We always attach the user from the token, never from the request body,
    // so a user cannot create transactions pretending to be someone else
    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: Number(amount),
      category: category || 'Uncategorized',
      merchant,
      note,
      date: date ? new Date(date) : Date.now(),
      source: source || 'manual',
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/transactions — List the logged-in user's transactions
// Supports filters: ?type=expense&category=Food&month=10&year=2026&page=1&limit=20
// ---------------------------------------------------------------
const getTransactions = async (req, res, next) => {
  try {
    // Start with a filter that always restricts results to the logged-in user
    // This is the key security rule: users can only ever see their own data
    const filter = { user: req.user._id };

    // --- Optional filter: type ---
    if (req.query.type) {
      filter.type = req.query.type;
    }

    // --- Optional filter: category ---
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // --- Optional filter: month and year ---
    // If both are provided, we build a date range for that month
    // e.g. ?month=10&year=2026 → filter dates from Oct 1 to Oct 31
    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);

      // Month in JavaScript Date is 0-indexed (Jan=0, Oct=9), so we subtract 1
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // last moment of last day

      filter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // --- Optional filter: search (matches merchant or note, case-insensitive) ---
    // We escape special regex characters to prevent regex injection or crashes
    if (req.query.search && req.query.search.trim()) {
      const safeSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');
      filter.$or = [
        { merchant: searchRegex },
        { note: searchRegex },
      ];
    }

    // --- Pagination ---
    // page=1 means the first page, limit=20 means 20 results per page
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // skip tells MongoDB how many documents to jump over
    // e.g. page 2 with limit 20 → skip the first 20, return the next 20
    const skip = (page - 1) * limit;

    // Count total matching documents so the frontend can show "Page 1 of 5"
    const total = await Transaction.countDocuments(filter);

    // Fetch the actual transactions, sorted newest first (-1 = descending by date)
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// PUT /api/transactions/:id — Update a transaction
// ---------------------------------------------------------------
const updateTransaction = async (req, res, next) => {
  try {
    // First, find the transaction by its ID in the URL parameter
    const transaction = await Transaction.findById(req.params.id);

    // If no transaction was found, return 404
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // SECURITY CHECK: Compare the transaction's owner with the logged-in user
    // transaction.user is a MongoDB ObjectId, so we convert both sides to strings before comparing
    // Without this check, any logged-in user could edit anyone else's transactions just by
    // knowing the transaction ID
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
      // Note: We return 404 (not 403 Forbidden) intentionally — it does not reveal
      // that the transaction exists but belongs to someone else
    }

    // Validate any fields that were sent in the request body
    const validationError = validateTransactionInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Pull only the fields we allow to be updated (user and source cannot be changed)
    const { type, amount, category, merchant, note, date } = req.body;

    // Only update a field if it was actually sent — we don't want to wipe fields
    // that the user didn't include in the request
    if (type !== undefined) transaction.type = type;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (category !== undefined) transaction.category = category;
    if (merchant !== undefined) transaction.merchant = merchant;
    if (note !== undefined) transaction.note = note;
    if (date !== undefined) transaction.date = new Date(date);

    // Save runs Mongoose validators again, so invalid data is caught here too
    const updated = await transaction.save();

    res.status(200).json({ success: true, transaction: updated });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// DELETE /api/transactions/:id — Delete a transaction
// ---------------------------------------------------------------
const deleteTransaction = async (req, res, next) => {
  try {
    // Find the transaction by the ID in the URL
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // SECURITY CHECK: Same ownership check as in updateTransaction
    // If the transaction belongs to a different user, pretend it doesn't exist
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // deleteOne() removes this specific document from MongoDB
    await transaction.deleteOne();

    res.status(200).json({ success: true, message: 'Transaction deleted.' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// POST /api/transactions/parse-sms — Parse bank SMS text without saving
// Takes { text } in request body, parses financial fields, returns parsed data
// ---------------------------------------------------------------
const parseSmsMessage = async (req, res, next) => {
  try {
    const { text } = req.body;

    // Validate that text is provided and is a non-empty string
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the SMS text to parse.',
      });
    }

    // Call our parser utility
    const parsed = parseSms(text);

    // If the SMS is not a transaction (e.g. OTP, promotional offer, balance check)
    // we return 422 Unprocessable Entity
    if (!parsed) {
      return res.status(422).json({
        success: false,
        message: 'Could not parse SMS as a financial transaction. Make sure it is a valid bank debit/credit message.',
      });
    }

    // Success: return parsed details without saving to the database
    // The user can review/edit these fields in the frontend before confirming
    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/transactions/summary — Aggregate income, expense, and net for a month
// Uses MongoDB aggregation framework to compute totals in the database
// ---------------------------------------------------------------
const getTransactionSummary = async (req, res, next) => {
  try {
    const now = new Date();
    // Default to current month and year if not specified in query params
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // Build the date boundaries for the given month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Run aggregation to calculate totals grouped by transaction type ('income' or 'expense')
    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let income = 0;
    let expense = 0;
    let count = 0;

    summary.forEach((item) => {
      count += item.count;
      if (item._id === 'income') {
        income = item.total;
      } else if (item._id === 'expense') {
        expense = item.total;
      }
    });

    const net = income - expense;

    res.status(200).json({
      success: true,
      income,
      expense,
      net,
      count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  parseSmsMessage,
  getTransactionSummary,
};
