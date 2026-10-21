// controllers/recurringController.js — Handles recurring payment reminders, forecast expansion, and auto-detection
const Recurring = require('../models/Recurring');
const Transaction = require('../models/Transaction');
const { detectRecurring } = require('../utils/recurringDetector');

// ---------------------------------------------------------------
// GET /api/recurring — List all active and paused recurring reminders
// Calculates monthly expense forecast total
// ---------------------------------------------------------------
const getRecurring = async (req, res, next) => {
  try {
    // Only return items that are not dismissed (i.e. active or paused)
    const items = await Recurring.find({
      user: req.user._id,
      status: { $ne: 'dismissed' },
    }).sort({ nextDate: 1 });

    // Calculate monthly expense total (weekly x 4.33, monthly x 1, yearly / 12)
    // Only active expenses are counted towards monthly forecast
    let monthlyTotal = 0;
    items.forEach((item) => {
      if (item.type === 'expense' && item.status === 'active') {
        if (item.frequency === 'weekly') {
          monthlyTotal += item.amount * 4.33;
        } else if (item.frequency === 'monthly') {
          monthlyTotal += item.amount;
        } else if (item.frequency === 'yearly') {
          monthlyTotal += item.amount / 12;
        }
      }
    });

    res.status(200).json({
      success: true,
      recurring: items,
      monthlyTotal: Math.round(monthlyTotal),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/recurring/upcoming?days=30
// Expands active recurring items into chronological occurrences falling in the next N days
// ---------------------------------------------------------------
const getUpcoming = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + days);
    end.setHours(23, 59, 59, 999);

    const activeItems = await Recurring.find({
      user: req.user._id,
      status: 'active',
    });

    const occurrences = [];

    activeItems.forEach((item) => {
      let current = new Date(item.nextDate);

      // Roll forward if nextDate stored in DB is older than today
      while (current < start) {
        if (item.frequency === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else if (item.frequency === 'monthly') {
          current.setMonth(current.getMonth() + 1);
        } else if (item.frequency === 'yearly') {
          current.setFullYear(current.getFullYear() + 1);
        }
      }

      // Collect all occurrences within the requested [start, end] window
      while (current <= end) {
        occurrences.push({
          recurringId: item._id,
          name: item.name,
          amount: item.amount,
          type: item.type,
          category: item.category || 'Other',
          frequency: item.frequency,
          date: current.toISOString(),
        });

        // Step forward by frequency
        if (item.frequency === 'weekly') {
          current = new Date(current);
          current.setDate(current.getDate() + 7);
        } else if (item.frequency === 'monthly') {
          current = new Date(current);
          current.setMonth(current.getMonth() + 1);
        } else if (item.frequency === 'yearly') {
          current = new Date(current);
          current.setFullYear(current.getFullYear() + 1);
        }
      }
    });

    // Sort chronologically ascending
    occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      upcoming: occurrences,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// GET /api/recurring/suggestions
// Runs detector on past 12 months transactions, filtering out already tracked or dismissed
// ---------------------------------------------------------------
const getSuggestions = async (req, res, next) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch user transactions from past 12 months
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: oneYearAgo },
    }).sort({ date: 1 });

    const detected = detectRecurring(transactions);

    // Fetch user's existing recurring entries (including dismissed ones)
    const existing = await Recurring.find({ user: req.user._id });
    const existingKeys = new Set(
      existing.map((r) => `${r.merchantKey || r.name.toLowerCase().trim()}:::${r.type}`)
    );

    // Remove anything already tracked or dismissed by the user
    const remaining = detected.filter(
      (d) => !existingKeys.has(`${d.merchantKey}:::${d.type}`)
    );

    res.status(200).json({
      success: true,
      suggestions: remaining,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// POST /api/recurring — Create recurring payment reminder
// ---------------------------------------------------------------
const createRecurring = async (req, res, next) => {
  try {
    const {
      name,
      type,
      amount,
      category,
      frequency,
      nextDate,
      status,
      source,
      merchantKey,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name for this recurring payment.',
      });
    }

    if (!type || (type !== 'income' && type !== 'expense')) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "income" or "expense".',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a number greater than 0.',
      });
    }

    if (!frequency || !['weekly', 'monthly', 'yearly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Frequency must be "weekly", "monthly", or "yearly".',
      });
    }

    if (!nextDate || isNaN(Date.parse(nextDate))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid next payment date.',
      });
    }

    const trimmedName = name.trim();
    const finalMerchantKey = merchantKey
      ? merchantKey.toLowerCase().trim()
      : trimmedName.toLowerCase();

    const recurring = await Recurring.create({
      user: req.user._id,
      name: trimmedName,
      type,
      amount: Math.round(numAmount),
      category: category ? category.trim() : 'Other',
      frequency,
      nextDate: new Date(nextDate),
      status: status || 'active',
      source: source || 'manual',
      merchantKey: finalMerchantKey,
    });

    res.status(201).json({
      success: true,
      recurring,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// PUT /api/recurring/:id — Update fields, toggle pause/active, or dismiss
// ---------------------------------------------------------------
const updateRecurring = async (req, res, next) => {
  try {
    const recurring = await Recurring.findById(req.params.id);

    if (!recurring || recurring.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Recurring payment not found.',
      });
    }

    const {
      name,
      type,
      amount,
      category,
      frequency,
      nextDate,
      status,
    } = req.body;

    if (name !== undefined) recurring.name = name.trim();
    if (type !== undefined) recurring.type = type;
    if (amount !== undefined) {
      const num = Number(amount);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0.',
        });
      }
      recurring.amount = Math.round(num);
    }
    if (category !== undefined) recurring.category = category.trim();
    if (frequency !== undefined) recurring.frequency = frequency;
    if (nextDate !== undefined) recurring.nextDate = new Date(nextDate);
    if (status !== undefined) recurring.status = status;

    const updated = await recurring.save();

    res.status(200).json({
      success: true,
      recurring: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------
// DELETE /api/recurring/:id — Delete recurring item (owner only, 404 otherwise)
// ---------------------------------------------------------------
const deleteRecurring = async (req, res, next) => {
  try {
    const recurring = await Recurring.findById(req.params.id);

    if (!recurring || recurring.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Recurring payment not found.',
      });
    }

    await recurring.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Recurring payment deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecurring,
  getUpcoming,
  getSuggestions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
