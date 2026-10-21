// services/transactionService.js — API calls for transactions and SMS parsing
import api from './api';

/**
 * List transactions for the logged-in user with optional query filters.
 * @param {object} [params] - { type, category, month, year, search, page, limit }
 */
export async function listTransactions(params = {}) {
  const response = await api.get('/transactions', { params });
  return response.data;
}

/**
 * Create a new transaction.
 * @param {object} data - { type, amount, category, merchant, note, date, source }
 */
export async function createTransaction(data) {
  const response = await api.post('/transactions', data);
  return response.data;
}

/**
 * Update an existing transaction.
 * @param {string} id - Transaction ID
 * @param {object} data - Updated fields
 */
export async function updateTransaction(id, data) {
  const response = await api.put(`/transactions/${id}`, data);
  return response.data;
}

/**
 * Delete a transaction by ID.
 * @param {string} id - Transaction ID
 */
export async function deleteTransaction(id) {
  const response = await api.delete(`/transactions/${id}`);
  return response.data;
}

/**
 * Get aggregated summary (income, expense, net, count) for a specific month.
 * @param {object} [params] - { month, year }
 */
export async function getTransactionSummary(params = {}) {
  const response = await api.get('/transactions/summary', { params });
  return response.data;
}

/**
 * Parse a bank SMS message without saving to the database.
 * @param {string} text - Raw SMS text
 */
export async function parseSms(text) {
  const response = await api.post('/transactions/parse-sms', { text });
  return response.data;
}

/**
 * Suggest a category for a merchant name.
 * @param {object} params - { merchant, note, type }
 */
export async function suggestCategory(params = {}) {
  const response = await api.get('/transactions/suggest-category', { params });
  return response.data;
}

/**
 * Bulk recategorize all transactions for a given merchant.
 * @param {object} data - { merchant, category }
 */
export async function recategorizeTransactions(data) {
  const response = await api.post('/transactions/recategorize', data);
  return response.data;
}

