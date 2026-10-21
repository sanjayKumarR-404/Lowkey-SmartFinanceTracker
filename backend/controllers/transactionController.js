// controllers/transactionController.js — Handles all CRUD for transactions
// CRUD = Create, Read, Update, Delete — the four basic database operations

const Transaction = require('../models/Transaction');
const CategoryRule = require('../models/CategoryRule');
const { parseSms } = require('../utils/smsParser');
const { categorize, ALLOWED_CATEGORIES } = require('../utils/categorizer');

// ---------------------------------------------------------------
// Helper: escape special regex characters
// ---------------------------------------------------------------
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------
// Helper: resolve category for a user
// Priority:
// 1. The logged-in user's saved CategoryRule for that merchantKey ("your earlier choice")
// 2. Keyword-based categorizer ("keyword match")
// 3. Fallback: "Other" ("default")
// ---------------------------------------------------------------
const resolveCategoryForUser = async (userId, { merchant = '', note = '', type = 'expense' }) => {
  const trimmedMerchant = (merchant || '').trim();
  if (trimmedMerchant) {
    const merchantKey = trimmedMerchant.toLowerCase();
    const rule = await CategoryRule.findOne({ user: userId, merchantKey });
    if (rule && rule.category) {
      return { category: rule.category, reason: 'your earlier choice' };
    }
  }

  const kwCategory = categorize({ merchant: trimmedMerchant, note, type });
  if (kwCategory && kwCategory !== 'Other') {
    return { category: kwCategory, reason: 'keyword match' };
  }

  return { category: 'Other', reason: 'default' };
};

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

    // Category auto-resolution if missing, empty or "Uncategorized"
    let finalCategory = category;
    if (
      !finalCategory ||
      typeof finalCategory !== 'string' ||
      finalCategory.trim() === '' ||
      finalCategory.trim() === 'Uncategorized'
    ) {
      const resolved = await resolveCategoryForUser(req.user._id, { merchant, note, type });
      finalCategory = resolved.category;
    }

    // req.user._id comes from the authMiddleware — it's the logged-in user's ID
    // We always attach the user from the token, never from the request body,
    // so a user cannot create transactions pretending to be someone else
    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: Number(amount),
      category: finalCategory,
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

    const oldCategory = transaction.category;

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

    let similarCount = 0;
    // Learning: when a transaction is updated and its category changed and it has a merchant,
    // save or update the user's CategoryRule for that merchant.
    // Include in the update response the number of OTHER transactions of this user with
    // the same merchant but a different category, as similarCount.
    if (
      category !== undefined &&
      category.trim() !== oldCategory &&
      updated.merchant &&
      updated.merchant.trim()
    ) {
      const merchantTrimmed = updated.merchant.trim();
      const merchantKey = merchantTrimmed.toLowerCase();

      await CategoryRule.findOneAndUpdate(
        { user: req.user._id, merchantKey },
        { category: category.trim() },
        { upsert: true, new: true }
      );

      const escaped = escapeRegex(merchantTrimmed);
      similarCount = await Transaction.countDocuments({
        user: req.user._id,
        _id: { $ne: updated._id },
        merchant: { $regex: new RegExp(`^${escaped}$`, 'i') },
        category: { $ne: category.trim() },
      });
    }

    res.status(200).json({ success: true, transaction: updated, similarCount });
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
// Also returns suggestedCategory and reason based on user rules or keywords
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

    // Suggest category according to user's saved rule -> categorizer -> Other
    const resolved = await resolveCategoryForUser(req.user._id, {
      merchant: parsed.merchant,
      note: '',
      type: parsed.type,
    });

    // Success: return parsed details including suggested category
    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        suggestedCategory: resolved.category,
        reason: resolved.reason,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/transactions/suggest-category?merchant=...
// Returns { category, reason } where reason is:
// "your earlier choice" | "keyword match" | "default"
// ---------------------------------------------------------------
const suggestCategory = async (req, res, next) => {
  try {
    const merchant = req.query.merchant || '';
    const note = req.query.note || '';
    const type = req.query.type || 'expense';

    const resolved = await resolveCategoryForUser(req.user._id, { merchant, note, type });

    res.status(200).json({
      success: true,
      category: resolved.category,
      reason: resolved.reason,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// POST /api/transactions/recategorize with { merchant, category }
// Sets the category on all of the logged-in user's transactions with that merchant
// (case-insensitive exact match) and returns how many changed.
// Validates the category against the allowed list.
// ---------------------------------------------------------------
const recategorizeTransactions = async (req, res, next) => {
  try {
    const { merchant, category } = req.body;

    if (!merchant || typeof merchant !== 'string' || !merchant.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a merchant name.',
      });
    }

    if (!category || typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`,
      });
    }

    const trimmedMerchant = merchant.trim();
    const trimmedCategory = category.trim();
    const escaped = escapeRegex(trimmedMerchant);

    // Save or update user's CategoryRule
    await CategoryRule.findOneAndUpdate(
      { user: req.user._id, merchantKey: trimmedMerchant.toLowerCase() },
      { category: trimmedCategory },
      { upsert: true, new: true }
    );

    // Update all transactions of this user with matching merchant (case-insensitive)
    const result = await Transaction.updateMany(
      {
        user: req.user._id,
        merchant: { $regex: new RegExp(`^${escaped}$`, 'i') },
      },
      {
        $set: { category: trimmedCategory },
      }
    );

    const updatedCount = result.modifiedCount ?? result.nModified ?? 0;

    res.status(200).json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} transaction${updatedCount === 1 ? '' : 's'}.`,
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
  suggestCategory,
  recategorizeTransactions,
};

