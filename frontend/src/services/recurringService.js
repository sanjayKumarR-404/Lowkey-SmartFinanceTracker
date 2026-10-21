// services/recurringService.js — API client for recurring payments & forecasts
import api from './api';

/**
 * Fetch all active and paused recurring reminders + monthly total.
 */
export async function getRecurring() {
  const response = await api.get('/recurring');
  return response.data;
}

/**
 * Fetch chronological payment occurrences in the next N days.
 * @param {object} [params] - { days }
 */
export async function getUpcoming(params = {}) {
  const response = await api.get('/recurring/upcoming', { params });
  return response.data;
}

/**
 * Fetch automatically detected recurring candidates from past transactions.
 */
export async function getSuggestions() {
  const response = await api.get('/recurring/suggestions');
  return response.data;
}

/**
 * Create a new recurring reminder (manual or from detection).
 * @param {object} data - { name, type, amount, category, frequency, nextDate, status, source, merchantKey }
 */
export async function createRecurring(data) {
  const response = await api.post('/recurring', data);
  return response.data;
}

/**
 * Update recurring fields, pause, resume, or dismiss.
 * @param {string} id - Recurring item ID
 * @param {object} data - Updated fields
 */
export async function updateRecurring(id, data) {
  const response = await api.put(`/recurring/${id}`, data);
  return response.data;
}

/**
 * Delete a recurring reminder permanently.
 * @param {string} id - Recurring item ID
 */
export async function deleteRecurring(id) {
  const response = await api.delete(`/recurring/${id}`);
  return response.data;
}
