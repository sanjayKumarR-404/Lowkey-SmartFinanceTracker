// utils/formatters.js — Shared currency, number, and date formatters
// All money values in Lowkey are formatted with Indian digit grouping (Lakhs / Crores)
// e.g. ₹1,25,000.50 instead of Western grouping ₹125,000.50.

/**
 * Formats a numeric amount in Indian Rupees (₹) with Indian grouping.
 * @param {number|string} amount - The amount to format
 * @param {boolean} [showSign=false] - Whether to prefix with + for positive numbers
 * @returns {string} e.g. "₹1,25,000.50"
 */
export function formatCurrency(amount, showSign = false) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numeric)) {
    return '₹0.00';
  }

  // Use the native Intl.NumberFormat configured specifically for Indian English ('en-IN')
  // which produces the correct 3-2-2 digit comma grouping.
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));

  if (numeric < 0) {
    return `-${formatted}`;
  }
  if (showSign && numeric > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Formats a date into a clean, human-readable string: "21 Oct 2026".
 * @param {string|Date} date - The date to format
 * @returns {string} e.g. "21 Oct 2026"
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a month and year for budget display: "Oct 2026".
 * @param {string|Date} date
 * @returns {string} e.g. "Oct 2026"
 */
export function formatMonthYear(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(d);
}
