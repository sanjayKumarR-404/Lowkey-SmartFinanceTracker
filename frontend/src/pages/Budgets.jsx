// pages/Budgets.jsx — Monthly category budgets management and tracking
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import {
  getBudgets,
  getBudgetSuggestions,
  createOrUpdateBudget,
  deleteBudget,
} from '../services/budgetService';
import { CATEGORIES, getCategoryByName } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import EmptyState from '../components/EmptyState';
import './Budgets.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Budgets() {
  const { showToast } = useToast();
  const { registerRefreshListener } = useTransactionDrawer();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer state for adding / editing a single budget
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Suggestions modal state
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const [suggestAmounts, setSuggestAmounts] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [savingSuggestions, setSavingSuggestions] = useState(false);

  // Fetch budgets data
  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBudgets({ month, year });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load monthly budgets.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Refresh budgets whenever a transaction is modified via drawer
  useEffect(() => {
    const unregister = registerRefreshListener(loadBudgets);
    return unregister;
  }, [registerRefreshListener, loadBudgets]);

  // Month navigation
  const handlePrevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Determine existing budgeted categories
  const existingCategorySet = useMemo(() => {
    if (!data?.budgets) return new Set();
    return new Set(data.budgets.map((b) => b.category));
  }, [data]);

  // Filter available categories for creating a new budget (excluding Salary and already budgeted)
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter(
      (c) => c.name !== 'Salary' && !existingCategorySet.has(c.name)
    );
  }, [existingCategorySet]);

  // Open drawer for adding a new budget
  const handleOpenAdd = () => {
    setEditingBudget(null);
    setFormCategory(availableCategories[0]?.name || '');
    setFormAmount('');
    setFormError('');
    setIsDrawerOpen(true);
  };

  // Open drawer for editing an existing budget
  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setFormCategory(budget.category);
    setFormAmount(String(budget.limit));
    setFormError('');
    setIsDrawerOpen(true);
  };

  // Submit budget form (create or edit)
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const num = parseFloat(formAmount);
    if (!formCategory) {
      setFormError('Please select a category.');
      return;
    }
    if (!formAmount || isNaN(num) || num <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');
      await createOrUpdateBudget({
        category: formCategory,
        amount: num,
      });

      showToast({
        message: editingBudget ? 'Budget updated' : 'Budget created',
        type: 'success',
      });
      setIsDrawerOpen(false);
      loadBudgets();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete budget with Undo toast pattern
  const handleDeleteBudget = async (budget) => {
    try {
      await deleteBudget(budget._id);
      loadBudgets();
      showToast({
        message: `${budget.category} budget deleted`,
        type: 'info',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await createOrUpdateBudget({
                category: budget.category,
                amount: budget.limit,
              });
              loadBudgets();
              showToast({
                message: `${budget.category} budget restored`,
                type: 'success',
              });
            } catch (err) {
              showToast({
                message: 'Could not restore budget',
                type: 'error',
              });
            }
          },
        },
      });
    } catch (err) {
      showToast({
        message: err.response?.data?.message || 'Could not delete budget',
        type: 'error',
      });
    }
  };

  // Open suggestions modal
  const handleOpenSuggestions = async () => {
    try {
      setIsSuggestModalOpen(true);
      setLoadingSuggestions(true);
      const res = await getBudgetSuggestions({ month, year });
      const suggs = res.suggestions || [];
      setSuggestions(suggs);

      // Preselect all suggestions by default
      const initialSelected = {};
      const initialAmounts = {};
      suggs.forEach((s) => {
        initialSelected[s.category] = true;
        initialAmounts[s.category] = s.suggestedAmount;
      });
      setSelectedSuggestions(initialSelected);
      setSuggestAmounts(initialAmounts);
    } catch (err) {
      showToast({
        message: err.response?.data?.message || 'Could not fetch suggestions',
        type: 'error',
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Save selected suggestions
  const handleSaveSelectedSuggestions = async () => {
    const categoriesToSave = Object.keys(selectedSuggestions).filter(
      (cat) => selectedSuggestions[cat]
    );

    if (categoriesToSave.length === 0) {
      setIsSuggestModalOpen(false);
      return;
    }

    try {
      setSavingSuggestions(true);
      for (const cat of categoriesToSave) {
        const amt = parseFloat(suggestAmounts[cat]);
        if (amt && amt > 0) {
          await createOrUpdateBudget({ category: cat, amount: amt });
        }
      }
      showToast({
        message: `Created ${categoriesToSave.length} budget${categoriesToSave.length === 1 ? '' : 's'}`,
        type: 'success',
      });
      setIsSuggestModalOpen(false);
      loadBudgets();
    } catch (err) {
      showToast({
        message: 'Could not save suggested budgets.',
        type: 'error',
      });
    } finally {
      setSavingSuggestions(false);
    }
  };

  // Warnings for categories near or over limit
  const warningItems = useMemo(() => {
    if (!data?.budgets) return [];
    return data.budgets
      .filter((b) => b.status === 'over' || b.status === 'near')
      .map((b) => {
        if (b.status === 'over') {
          const overAmount = b.spent - b.limit;
          return `${b.category} is over by ${formatCurrency(overAmount)}`;
        }
        return `${b.category} is near limit (${b.percent}% spent)`;
      });
  }, [data]);

  return (
    <div className="budgets-page">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="budgets-header">
        <h1 className="dash-title">Budgets</h1>

        <div className="budgets-header-actions">
          {/* Month Switcher */}
          <div className="budgets-month-switcher" aria-label="Month selector">
            <button
              type="button"
              className="budgets-month-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="budgets-month-label">
              {MONTH_NAMES[currentDate.getMonth()]} {year}
            </span>
            <button
              type="button"
              className="budgets-month-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleOpenSuggestions}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            <span>Suggest budgets</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenAdd}
            disabled={availableCategories.length === 0}
            title={availableCategories.length === 0 ? 'All categories already budgeted' : 'Add budget'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add budget</span>
          </button>
        </div>
      </div>

      {/* ── Skeletons ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="budgets-summary-card" style={{ height: 160, opacity: 0.6 }}>
            <div className="skel skel-p" style={{ width: '40%' }} />
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              <div className="skel skel-h1" style={{ flex: 1 }} />
              <div className="skel skel-h1" style={{ flex: 1 }} />
              <div className="skel skel-h1" style={{ flex: 1 }} />
            </div>
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="budget-row-card" style={{ height: 72, opacity: 0.6 }}>
              <div className="skel skel-circle" style={{ width: 40, height: 40 }} />
              <div style={{ flex: 1 }}>
                <div className="skel skel-p" style={{ width: '30%', marginBottom: 8 }} />
                <div className="skel skel-bar" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="dash-error" style={{ margin: '40px auto', maxWidth: 450 }}>
          <AlertTriangle size={32} style={{ color: 'var(--expense)' }} />
          <h3>Could not load budgets</h3>
          <p>{error}</p>
          <button
            type="button"
            onClick={loadBudgets}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!loading && !error && data?.budgets?.length === 0 && (
        <EmptyState
          icon={PieIcon}
          title="No budgets set"
          description={`Set monthly targets for ${MONTH_NAMES[currentDate.getMonth()]} to track expenses and avoid surprises.`}
          actionLabel="Add budget"
          onAction={handleOpenAdd}
        />
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {!loading && !error && data?.budgets?.length > 0 && (
        <div>
          {/* Warning Strip when any category is near or over limit */}
          {warningItems.length > 0 && (
            <div className="budgets-warning-strip" role="alert">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div className="budgets-warning-content">
                {warningItems.map((msg, idx) => (
                  <div key={idx} className="budgets-warning-item">
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Summary Card: Budgeted / Spent / Left */}
          <div className="budgets-summary-card">
            <div className="budgets-summary-grid">
              <div className="budgets-summary-stat">
                <span className="budgets-stat-label">Budgeted</span>
                <span className="budgets-stat-value">
                  {formatCurrency(data.totals.limit)}
                </span>
              </div>
              <div className="budgets-summary-stat">
                <span className="budgets-stat-label">Spent</span>
                <span className="budgets-stat-value">
                  {formatCurrency(data.totals.spent)}
                </span>
              </div>
              <div className="budgets-summary-stat">
                <span className="budgets-stat-label">
                  {data.totals.remaining >= 0 ? 'Left' : 'Overspent'}
                </span>
                <span
                  className={`budgets-stat-value ${
                    data.totals.percent > 100
                      ? 'over'
                      : data.totals.percent >= 80
                      ? 'near'
                      : 'ok'
                  }`}
                >
                  {formatCurrency(Math.abs(data.totals.remaining))}
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="budgets-overall-bar-wrapper">
              <div className="budgets-overall-bar-header">
                <span>Total budget usage</span>
                <span style={{ fontWeight: 600 }}>{data.totals.percent}%</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${
                    data.totals.percent > 100
                      ? 'over'
                      : data.totals.percent >= 80
                      ? 'near'
                      : 'ok'
                  }`}
                  style={{ width: `${Math.min(data.totals.percent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Category Rows */}
          <div className="budgets-list-title">Category breakdown</div>
          <div className="budgets-list">
            {data.budgets.map((b) => {
              const catConfig = getCategoryByName(b.category);
              const Icon = catConfig.icon;

              return (
                <div key={b._id} className="budget-row-card">
                  {/* Category Icon */}
                  <div
                    className="budget-cat-icon"
                    style={{
                      backgroundColor: `${catConfig.color}18`,
                      color: catConfig.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Info */}
                  <div className="budget-row-info">
                    <div className="budget-row-top">
                      <span className="budget-cat-name">{b.category}</span>
                      <div className="budget-numbers-group">
                        <span className="budget-spent-text">
                          {formatCurrency(b.spent)}
                        </span>
                        <span className="budget-limit-text">
                          of {formatCurrency(b.limit)}
                        </span>
                        <span className={`budget-percent-badge ${b.status}`}>
                          {b.percent}%
                        </span>
                      </div>
                    </div>

                    <div className="budget-row-bottom">
                      <div className="budget-row-bar-container">
                        <div className="progress-track" style={{ height: 6 }}>
                          <div
                            className={`progress-fill ${b.status}`}
                            style={{ width: `${Math.min(b.percent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Plain words status */}
                      <span className={`budget-status-text ${b.status}`}>
                        {b.status === 'over'
                          ? `Over by ${formatCurrency(b.spent - b.limit)}`
                          : b.status === 'near'
                          ? 'Near limit'
                          : 'On track'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="budget-row-actions">
                    <button
                      type="button"
                      className="budget-action-btn"
                      onClick={() => handleOpenEdit(b)}
                      title="Edit budget"
                      aria-label={`Edit ${b.category} budget`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="budget-action-btn delete"
                      onClick={() => handleDeleteBudget(b)}
                      title="Delete budget"
                      aria-label={`Delete ${b.category} budget`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add / Edit Budget Drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div
            className="drawer-backdrop"
            onClick={() => setIsDrawerOpen(false)}
            role="presentation"
          >
            <motion.div
              className="drawer-panel"
              onClick={(e) => e.stopPropagation()}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="budget-drawer-title"
            >
              <div className="drawer-header">
                <h2 id="budget-drawer-title" className="drawer-title">
                  {editingBudget ? `Edit ${editingBudget.category} budget` : 'Add budget'}
                </h2>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className="drawer-body">
                {/* Category field */}
                <div className="drawer-form-group">
                  <label htmlFor="budget-cat-select" className="drawer-label">
                    Category
                  </label>
                  {editingBudget ? (
                    <input
                      id="budget-cat-select"
                      type="text"
                      className="drawer-input"
                      value={formCategory}
                      disabled
                      style={{ opacity: 0.8 }}
                    />
                  ) : (
                    <select
                      id="budget-cat-select"
                      className="drawer-select"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      required
                    >
                      {availableCategories.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount field */}
                <div className="drawer-form-group">
                  <label htmlFor="budget-amount-input" className="drawer-label">
                    Monthly spending limit
                  </label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      id="budget-amount-input"
                      type="number"
                      step="50"
                      min="1"
                      className="currency-input"
                      placeholder="e.g. 5000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  {formError && (
                    <span className="drawer-error-text">{formError}</span>
                  )}
                </div>

                <div
                  className="drawer-footer"
                  style={{ margin: 'auto -24px -24px -24px' }}
                >
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn-primary"
                  >
                    {formSubmitting
                      ? 'Saving…'
                      : editingBudget
                      ? 'Update budget'
                      : 'Create budget'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Suggestions Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isSuggestModalOpen && (
          <div
            className="drawer-backdrop"
            onClick={() => setIsSuggestModalOpen(false)}
            role="presentation"
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              className="dash-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '90%', maxWidth: 480, padding: '24px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.15rem',
                      fontWeight: 600,
                    }}
                  >
                    Budget suggestions
                  </h3>
                </div>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setIsSuggestModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Calculated from your average monthly spending over the past 3 months.
                Adjust any limits or uncheck categories you do not want to track.
              </p>

              {loadingSuggestions ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating spending history…
                </div>
              ) : suggestions.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No additional suggestions found. You either already have budgets for all your active categories, or have no past 3-month spending.
                </div>
              ) : (
                <div className="suggestions-list">
                  {suggestions.map((s) => {
                    const catConfig = getCategoryByName(s.category);
                    const Icon = catConfig.icon;
                    const isChecked = !!selectedSuggestions[s.category];

                    return (
                      <div key={s.category} className="suggestion-item">
                        <input
                          type="checkbox"
                          className="suggestion-checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedSuggestions((prev) => ({
                              ...prev,
                              [s.category]: e.target.checked,
                            }))
                          }
                        />

                        <div className="suggestion-cat">
                          <Icon size={16} style={{ color: catConfig.color }} />
                          <span>{s.category}</span>
                        </div>

                        <div className="suggestion-input-wrapper">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            step="50"
                            min="1"
                            className="suggestion-input"
                            value={suggestAmounts[s.category] ?? s.suggestedAmount}
                            onChange={(e) =>
                              setSuggestAmounts((prev) => ({
                                ...prev,
                                [s.category]: e.target.value,
                              }))
                            }
                            disabled={!isChecked}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsSuggestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={savingSuggestions || suggestions.length === 0}
                  onClick={handleSaveSelectedSuggestions}
                >
                  {savingSuggestions ? 'Creating…' : 'Create selected'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
