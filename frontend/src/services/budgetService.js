// services/budgetService.js — API client for monthly category budgets
import api from './api';

/**
 * Fetch monthly budgets with actual spending, remaining limits, and statuses.
 * @param {object} [params] - { month, year }
 */
export async function getBudgets(params = {}) {
  const response = await api.get('/budgets', { params });
  return response.data;
}

/**
 * Fetch algorithmic budget suggestions based on past 3-month spending.
 * @param {object} [params] - { month, year }
 */
export async function getBudgetSuggestions(params = {}) {
  const response = await api.get('/budgets/suggestions', { params });
  return response.data;
}

/**
 * Create or update (upsert) a category budget.
 * @param {object} data - { category, amount }
 */
export async function createOrUpdateBudget(data) {
  const response = await api.post('/budgets', data);
  return response.data;
}

/**
 * Delete a budget by ID.
 * @param {string} id - Budget ID
 */
export async function deleteBudget(id) {
  const response = await api.delete(`/budgets/${id}`);
  return response.data;
}
