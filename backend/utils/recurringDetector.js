// utils/recurringDetector.js — Algorithmic detector for repeating payments
// Scans transaction history (last 12 months) to discover subscriptions, rent, bills, or salary.
// No machine learning — uses deterministic heuristics: grouping, median tolerance, and date cadence.

const { advanceMonthly, isLastDayOfMonth } = require('./recurrenceDates');

/**
 * Calculates the median of an array of numbers.
 */
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Finds the most frequent category in an array of transactions.
 */
function getMostFrequentCategory(transactions) {
  const counts = {};
  transactions.forEach((t) => {
    const cat = t.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  let topCategory = 'Other';
  let maxCount = -1;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  }
  return topCategory;
}

/**
 * Rolls a date forward by frequency until it is today or in the future.
 */
function advanceNextDate(baseDate, frequency) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let next = new Date(baseDate);
  const anchorDay = next.getDate();
  const anchorMonthEnd = isLastDayOfMonth(next);

  // Initial step forward from the last seen transaction
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'monthly') {
    next = advanceMonthly(next, anchorDay, anchorMonthEnd);
  } else if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }

  // If already in the future or today, return
  while (next < now) {
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
      next = advanceMonthly(next, anchorDay, anchorMonthEnd);
    } else if (frequency === 'yearly') {
      next.setFullYear(next.getFullYear() + 1);
    }
  }

  return next;
}

/**
 * Detect recurring patterns in transactions.
 *
 * @param {Array<object>} transactions - User's transactions from the last 12 months
 * @returns {Array<object>} - Detected recurring items
 */
function detectRecurring(transactions = []) {
  // RULE 1: Group by lowercase merchant name and transaction type.
  // We ignore transactions that have no merchant specified.
  const groups = {};

  transactions.forEach((tx) => {
    const merchant = (tx.merchant || '').trim();
    if (!merchant) return;

    const merchantKey = merchant.toLowerCase();
    const type = tx.type || 'expense';
    const groupKey = `${merchantKey}:::${type}`;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push({
      amount: Number(tx.amount),
      date: new Date(tx.date),
      category: tx.category,
      rawMerchant: merchant,
    });
  });

  const detected = [];

  for (const [groupKey, items] of Object.entries(groups)) {
    // RULE 2: Need at least 3 transactions to establish a meaningful recurring pattern.
    if (items.length < 3) continue;

    const [merchantKey, type] = groupKey.split(':::');

    // RULE 3: Amounts within 10 percent of the group's median.
    // Calculate median across all items in group, then keep only consistent amounts.
    const allAmounts = items.map((t) => t.amount);
    const medianAmount = calculateMedian(allAmounts);
    if (medianAmount <= 0) continue;

    const consistentItems = items.filter((t) => {
      const variance = Math.abs(t.amount - medianAmount) / medianAmount;
      return variance <= 0.10; // Within 10% tolerance
    });

    // Ensure at least 3 occurrences still remain within the 10% amount variance
    if (consistentItems.length < 3) continue;

    // Sort chronologically ascending to compute intervals between consecutive payments
    consistentItems.sort((a, b) => a.date - b.date);

    // RULE 4: Calculate gaps in days between consecutive dates.
    const gaps = [];
    for (let i = 1; i < consistentItems.length; i++) {
      const diffMs = consistentItems[i].date - consistentItems[i - 1].date;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      // Ignore same-day duplicates (e.g. user retried payment on same day)
      if (diffDays > 0) {
        gaps.push(diffDays);
      }
    }

    if (gaps.length < 2) continue;

    // Count gaps fitting each cadence window:
    // - Weekly: 6 to 8 days
    // - Monthly: 26 to 35 days
    // - Yearly: 350 to 380 days
    let weeklyCount = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    gaps.forEach((gap) => {
      if (gap >= 6 && gap <= 8) weeklyCount++;
      if (gap >= 26 && gap <= 35) monthlyCount++;
      if (gap >= 350 && gap <= 380) yearlyCount++;
    });

    const halfGaps = Math.ceil(gaps.length * 0.5);
    let matchedFrequency = null;

    if (monthlyCount >= halfGaps && monthlyCount >= weeklyCount) {
      matchedFrequency = 'monthly';
    } else if (weeklyCount >= halfGaps) {
      matchedFrequency = 'weekly';
    } else if (yearlyCount >= halfGaps) {
      matchedFrequency = 'yearly';
    }

    // Skip if gaps are not consistently regular
    if (!matchedFrequency) continue;

    const lastTx = consistentItems[consistentItems.length - 1];
    const category = getMostFrequentCategory(consistentItems);
    const nextDate = advanceNextDate(lastTx.date, matchedFrequency);

    detected.push({
      name: lastTx.rawMerchant,
      merchantKey,
      type,
      amount: Math.round(medianAmount),
      category,
      frequency: matchedFrequency,
      lastDate: lastTx.date.toISOString(),
      nextDate: nextDate.toISOString(),
      occurrences: consistentItems.length,
    });
  }

  return detected;
}

module.exports = { detectRecurring };
