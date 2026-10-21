// controllers/budgetController.js — Handles budget CRUD, progress calculations, and suggestions
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

const ALLOWED_BUDGET_CATEGORIES = [
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

// ---------------------------------------------------------------
// GET /api/budgets?month=10&year=2026 — List budgets with monthly spending and status
// ---------------------------------------------------------------
const getBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // Date range for the given month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Fetch user's set budgets
    const userBudgets = await Budget.find({ user: req.user._id });

    // 2. Aggregate monthly expenses by category for this user
    const spendingAgg = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const spentMap = {};
    spendingAgg.forEach((item) => {
      spentMap[item._id] = item.total;
    });

    let totalLimit = 0;
    let totalSpent = 0;

    // 3. Compute progress, remaining, and status for each budget
    const budgetList = userBudgets.map((b) => {
      const limit = b.amount;
      const spent = spentMap[b.category] || 0;
      const remaining = limit - spent;
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'ok';
      if (percent > 100) {
        status = 'over';
      } else if (percent >= 80) {
        status = 'near';
      }

      totalLimit += limit;
      totalSpent += spent;

      return {
        _id: b._id,
        category: b.category,
        limit,
        spent,
        remaining,
        percent,
        status,
      };
    });

    // Sort by percent descending (highest percent first, so troubled budgets show at top)
    budgetList.sort((a, b) => b.percent - a.percent);

    const totalRemaining = totalLimit - totalSpent;
    const totalPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

    res.status(200).json({
      success: true,
      budgets: budgetList,
      totals: {
        limit: totalLimit,
        spent: totalSpent,
        remaining: totalRemaining,
        percent: totalPercent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/budgets/suggestions?month=10&year=2026
// For categories without a budget, suggest average spending of previous 3 months
// rounded up to nearest 100 INR.
// ---------------------------------------------------------------
const getBudgetSuggestions = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // Previous 3 months date range:
    // e.g. For Oct (month 10): 3 months prior are July, Aug, Sept
    const startDate = new Date(year, month - 4, 1);
    const endDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

    // Existing user budgets to exclude
    const existingBudgets = await Budget.find({ user: req.user._id });
    const existingCats = new Set(existingBudgets.map((b) => b.category));

    // Aggregate spending in the 3 months window
    const spendingHistory = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const suggestions = [];
    spendingHistory.forEach((item) => {
      const category = item._id;
      // Skip categories that already have a budget, or 'Salary'
      if (!existingCats.has(category) && category !== 'Salary' && ALLOWED_BUDGET_CATEGORIES.includes(category)) {
        const avg = item.total / 3;
        if (avg > 0) {
          // Round up to nearest 100
          const suggestedAmount = Math.ceil(avg / 100) * 100;
          suggestions.push({
            category,
            suggestedAmount,
          });
        }
      }
    });

    // Sort highest suggested limit first
    suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// POST /api/budgets { category, amount } — Create or update (upsert) budget
// ---------------------------------------------------------------
const createOrUpdateBudget = async (req, res, next) => {
  try {
    const { category, amount } = req.body;

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category.',
      });
    }

    const trimmedCat = category.trim();

    if (trimmedCat === 'Salary') {
      return res.status(400).json({
        success: false,
        message: 'Salary is an income category and cannot have an expense budget.',
      });
    }

    if (!ALLOWED_BUDGET_CATEGORIES.includes(trimmedCat)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${ALLOWED_BUDGET_CATEGORIES.join(', ')}.`,
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget amount must be a number greater than 0.',
      });
    }

    // Upsert budget (one budget per user per category)
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: trimmedCat },
      { amount: Math.round(numAmount) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// DELETE /api/budgets/:id — Delete a budget (owner only, 404 otherwise)
// ---------------------------------------------------------------
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget || budget.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found.',
      });
    }

    await budget.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Budget deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  getBudgetSuggestions,
  createOrUpdateBudget,
  deleteBudget,
};
