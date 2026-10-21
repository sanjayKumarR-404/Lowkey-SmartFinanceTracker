// controllers/analyticsController.js — Aggregation queries for the Dashboard overview
// All queries are scoped to the logged-in user only (req.user._id from authMiddleware).

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

/**
 * GET /api/analytics/overview?month=10&year=2026
 * Returns a full picture of a user's finances for one calendar month:
 *   - summary + previousMonth: income / expense / net
 *   - categoryBreakdown: expense totals by category, largest first
 *   - monthlyTrend: income + expense for the last 6 months
 *   - topMerchants: top 5 merchants by expense total (non-empty names only)
 *   - recent: the 6 newest transactions in the month
 */
async function getOverview(req, res, next) {
  try {
    const userId = req.user._id;

    // Parse month/year from query string; fall back to today if missing
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1; // 1-12
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // Build a Date range for the selected month (start inclusive, end exclusive)
    const start = new Date(year, month - 1, 1);      // e.g. 2026-10-01T00:00:00
    const end = new Date(year, month, 1);             // e.g. 2026-11-01T00:00:00

    // Previous month range for comparison
    const prevStart = new Date(year, month - 2, 1);  // e.g. 2026-09-01T00:00:00
    const prevEnd = new Date(year, month - 1, 1);    // e.g. 2026-10-01T00:00:00

    // -- 1. Summary for selected month --
    const summaryAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const summary = { income: 0, expense: 0, net: 0 };
    summaryAgg.forEach((row) => {
      if (row._id === 'income') summary.income = row.total;
      if (row._id === 'expense') summary.expense = row.total;
    });
    summary.net = summary.income - summary.expense;

    // -- 2. Summary for previous month --
    const prevAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: prevStart, $lt: prevEnd },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const previousMonth = { income: 0, expense: 0, net: 0 };
    prevAgg.forEach((row) => {
      if (row._id === 'income') previousMonth.income = row.total;
      if (row._id === 'expense') previousMonth.expense = row.total;
    });
    previousMonth.net = previousMonth.income - previousMonth.expense;

    // -- 3. Expense breakdown by category (selected month) --
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total: 1,
        },
      },
    ]);

    // -- 4. Monthly trend: last 6 months ending at selected month --
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      trendMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const trendStart = new Date(trendMonths[0].year, trendMonths[0].month - 1, 1);
    const trendEnd = end;

    const trendRaw = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: trendStart, $lt: trendEnd },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const trendMap = {};
    trendRaw.forEach((row) => {
      const key = `${row._id.year}-${row._id.month}-${row._id.type}`;
      trendMap[key] = row.total;
    });

    const monthlyTrend = trendMonths.map(({ year: y, month: m }) => ({
      year: y,
      month: m,
      income: trendMap[`${y}-${m}-income`] || 0,
      expense: trendMap[`${y}-${m}-expense`] || 0,
    }));

    // -- 5. Top 5 merchants by expense total (skip null/empty merchants) --
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lt: end },
          merchant: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$merchant',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          merchant: '$_id',
          total: 1,
          count: 1,
        },
      },
    ]);

    // -- 6. 6 most recent transactions in the selected month --
    const recent = await Transaction.find({
      user: userId,
      date: { $gte: start, $lt: end },
    })
      .sort({ date: -1 })
      .limit(6)
      .lean();

    res.json({
      summary,
      previousMonth,
      categoryBreakdown,
      monthlyTrend,
      topMerchants,
      recent,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
