// services/analyticsService.js — Calls the /api/analytics endpoints
// Uses the shared api.js axios instance which already attaches the JWT token.
import api from './api';

/**
 * Fetches the full dashboard overview for a given month and year.
 * @param {number} month - 1-based month (1 = January)
 * @param {number} year  - full year e.g. 2026
 * @returns {Promise<object>} { summary, previousMonth, categoryBreakdown, monthlyTrend, topMerchants, recent }
 */
export async function getOverview(month, year) {
  const res = await api.get('/analytics/overview', { params: { month, year } });
  return res.data;
}
