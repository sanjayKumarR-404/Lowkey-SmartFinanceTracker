// pages/Recurring.jsx — Recurring payments and recurring subscriptions management
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarSync,
  Plus,
  RotateCw,
  AlertTriangle,
  Sparkles,
  Calendar as CalendarIcon,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import {
  format,
  isToday,
  isTomorrow,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  getRecurring,
  getUpcoming,
  getSuggestions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '../services/recurringService';
import { CATEGORIES, getCategoryByName } from '../constants/categories';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import './Recurring.css';

/**
 * Format relative date for upcoming payments (e.g. "Today", "Tomorrow", "in 3 days")
 */
function formatRelativeDue(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(target, today);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff <= 7) return `in ${diff} days`;
  if (diff < 0) return 'Overdue';
  return format(target, 'MMM d');
}

export default function Recurring() {
  const { showToast } = useToast();

  const [recurringData, setRecurringData] = useState({ recurring: [], monthlyTotal: 0 });
  const [upcoming, setUpcoming] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode for Upcoming section: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');

  // Calendar navigation state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Drawer state for adding / editing recurring item
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Drawer form inputs
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [frequency, setFrequency] = useState('monthly');
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch all recurring data
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [recRes, upRes, suggRes] = await Promise.all([
        getRecurring(),
        getUpcoming({ days: 30 }),
        getSuggestions(),
      ]);

      setRecurringData(recRes);
      setUpcoming(upRes.upcoming || []);
      setSuggestions(suggRes.suggestions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recurring payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Group upcoming items into weeks
  const upcomingGrouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = {
      thisWeek: [],
      nextWeek: [],
      inTwoWeeks: [],
      later: [],
    };

    upcoming.forEach((item) => {
      const d = new Date(item.date);
      const diff = differenceInCalendarDays(d, today);

      if (diff <= 7) {
        groups.thisWeek.push(item);
      } else if (diff <= 14) {
        groups.nextWeek.push(item);
      } else if (diff <= 21) {
        groups.inTwoWeeks.push(item);
      } else {
        groups.later.push(item);
      }
    });

    return groups;
  }, [upcoming]);

  // Calendar dates computation
  const calendarDays = useMemo(() => {
    const startM = startOfMonth(calendarMonth);
    const endM = endOfMonth(calendarMonth);
    const startW = startOfWeek(startM, { weekStartsOn: 0 });
    const endW = endOfWeek(endM, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startW, end: endW });
  }, [calendarMonth]);

  // Map upcoming items by date string (YYYY-MM-DD) for calendar dots
  const upcomingByDateMap = useMemo(() => {
    const map = {};
    upcoming.forEach((item) => {
      const key = format(new Date(item.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [upcoming]);

  // Items for the selected day in calendar view
  const selectedDayItems = useMemo(() => {
    const key = format(selectedDay, 'yyyy-MM-dd');
    return upcomingByDateMap[key] || [];
  }, [selectedDay, upcomingByDateMap]);

  // Open drawer to add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setType('expense');
    setAmount('');
    setCategory(CATEGORIES[0].name);
    setFrequency('monthly');
    setNextDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setIsDrawerOpen(true);
  };

  // Open drawer to edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setType(item.type || 'expense');
    setAmount(String(item.amount));
    setCategory(item.category || CATEGORIES[0].name);
    setFrequency(item.frequency || 'monthly');
    setNextDate(
      item.nextDate
        ? new Date(item.nextDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setFormError('');
    setIsDrawerOpen(true);
  };

  // Submit recurring form
  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!name.trim()) {
      setFormError('Please enter a name.');
      return;
    }
    if (!amount || isNaN(num) || num <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        name: name.trim(),
        type,
        amount: num,
        category,
        frequency,
        nextDate: new Date(nextDate).toISOString(),
      };

      if (editingItem) {
        await updateRecurring(editingItem._id, payload);
        showToast({ message: 'Recurring payment updated', type: 'success' });
      } else {
        await createRecurring(payload);
        showToast({ message: 'Recurring payment added', type: 'success' });
      }

      setIsDrawerOpen(false);
      loadAll();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save recurring item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active / paused
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'paused' ? 'active' : 'paused';
    try {
      await updateRecurring(item._id, { status: nextStatus });
      showToast({
        message: `${item.name} ${nextStatus === 'paused' ? 'paused' : 'resumed'}`,
        type: 'info',
      });
      loadAll();
    } catch (err) {
      showToast({ message: 'Could not update status', type: 'error' });
    }
  };

  // Delete with Undo toast
  const handleDeleteRecurring = async (item) => {
    try {
      await deleteRecurring(item._id);
      loadAll();
      showToast({
        message: `${item.name} deleted`,
        type: 'info',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await createRecurring({
                name: item.name,
                type: item.type,
                amount: item.amount,
                category: item.category,
                frequency: item.frequency,
                nextDate: item.nextDate,
                status: item.status,
                source: item.source,
                merchantKey: item.merchantKey,
              });
              loadAll();
              showToast({ message: `${item.name} restored`, type: 'success' });
            } catch (e) {
              showToast({ message: 'Could not restore payment', type: 'error' });
            }
          },
        },
      });
    } catch (err) {
      showToast({ message: 'Could not delete item', type: 'error' });
    }
  };

  // Track suggestion
  const handleTrackSuggestion = async (sugg) => {
    try {
      await createRecurring({
        name: sugg.name,
        type: sugg.type,
        amount: sugg.amount,
        category: sugg.category,
        frequency: sugg.frequency,
        nextDate: sugg.nextDate,
        source: 'detected',
        merchantKey: sugg.merchantKey,
      });
      showToast({ message: `Tracking ${sugg.name}`, type: 'success' });
      loadAll();
    } catch (err) {
      showToast({ message: 'Could not track suggestion', type: 'error' });
    }
  };

  // Dismiss suggestion
  const handleDismissSuggestion = async (sugg) => {
    try {
      await createRecurring({
        name: sugg.name,
        type: sugg.type,
        amount: sugg.amount,
        category: sugg.category,
        frequency: sugg.frequency,
        nextDate: sugg.nextDate,
        status: 'dismissed',
        source: 'detected',
        merchantKey: sugg.merchantKey,
      });
      showToast({ message: `${sugg.name} marked as not recurring`, type: 'info' });
      // Optimistically remove from suggestions
      setSuggestions((prev) => prev.filter((s) => s.merchantKey !== sugg.merchantKey));
    } catch (err) {
      showToast({ message: 'Could not dismiss suggestion', type: 'error' });
    }
  };

  const activeCount = useMemo(() => {
    return recurringData.recurring.filter((r) => r.status === 'active').length;
  }, [recurringData.recurring]);

  return (
    <div className="recurring-page">
      {/* ── Top Strip ───────────────────────────────────────────────────────── */}
      <div className="recurring-top-strip">
        <div className="recurring-top-info">
          <div className="recurring-monthly-stat">
            <span className="recurring-stat-label">Monthly recurring expenses</span>
            <span className="recurring-stat-val">
              {formatCurrency(recurringData.monthlyTotal)}
            </span>
          </div>
          <span className="recurring-active-count">
            {activeCount} active payment{activeCount === 1 ? '' : 's'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Add recurring</span>
        </button>
      </div>

      {/* ── Skeletons ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="upcoming-container" style={{ height: 180, opacity: 0.6 }}>
            <div className="skel skel-p" style={{ width: '30%', marginBottom: 16 }} />
            <div className="skel skel-bar" style={{ height: 40, marginBottom: 8 }} />
            <div className="skel skel-bar" style={{ height: 40 }} />
          </div>
          <div className="recurring-rows-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="recurring-row" style={{ height: 60, opacity: 0.6 }}>
                <div className="skel skel-p" style={{ width: '25%' }} />
                <div className="skel skel-p" style={{ width: '15%' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="dash-error" style={{ margin: '40px auto', maxWidth: 450 }}>
          <AlertTriangle size={32} style={{ color: 'var(--expense)' }} />
          <h3>Could not load recurring payments</h3>
          <p>{error}</p>
          <button
            type="button"
            onClick={loadAll}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* ── Empty state (no recurring items and no suggestions) ─────────────── */}
      {!loading &&
        !error &&
        recurringData.recurring.length === 0 &&
        suggestions.length === 0 && (
          <EmptyState
            icon={CalendarSync}
            title="No recurring payments tracked"
            description="Track regular bills, digital subscriptions, rent, or salary to forecast cashflow."
            actionLabel="Add recurring payment"
            onAction={handleOpenAdd}
          />
        )}

      {!loading && !error && (recurringData.recurring.length > 0 || suggestions.length > 0) && (
        <div>
          {/* ── Upcoming Section ──────────────────────────────────────────────── */}
          <div className="section-header-row">
            <h2 className="section-title">Upcoming payments (next 30 days)</h2>

            {/* List / Calendar Switch */}
            <div className="view-mode-switch" role="tablist">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                role="tab"
                aria-selected={viewMode === 'list'}
              >
                <ListIcon size={14} />
                <span>List</span>
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                role="tab"
                aria-selected={viewMode === 'calendar'}
              >
                <CalendarIcon size={14} />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          <div className="upcoming-container">
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                No active payments scheduled in the next 30 days.
              </div>
            ) : viewMode === 'list' ? (
              /* Grouped by Week */
              <div>
                {upcomingGrouped.thisWeek.length > 0 && (
                  <div className="upcoming-group">
                    <div className="upcoming-group-title">This week</div>
                    {upcomingGrouped.thisWeek.map((item, idx) => (
                      <UpcomingItemRow key={idx} item={item} />
                    ))}
                  </div>
                )}
                {upcomingGrouped.nextWeek.length > 0 && (
                  <div className="upcoming-group">
                    <div className="upcoming-group-title">Next week</div>
                    {upcomingGrouped.nextWeek.map((item, idx) => (
                      <UpcomingItemRow key={idx} item={item} />
                    ))}
                  </div>
                )}
                {upcomingGrouped.inTwoWeeks.length > 0 && (
                  <div className="upcoming-group">
                    <div className="upcoming-group-title">In 2 weeks</div>
                    {upcomingGrouped.inTwoWeeks.map((item, idx) => (
                      <UpcomingItemRow key={idx} item={item} />
                    ))}
                  </div>
                )}
                {upcomingGrouped.later.length > 0 && (
                  <div className="upcoming-group">
                    <div className="upcoming-group-title">Later this month</div>
                    {upcomingGrouped.later.map((item, idx) => (
                      <UpcomingItemRow key={idx} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Custom Calendar View */
              <div className="calendar-wrapper">
                <div className="calendar-header">
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {format(calendarMonth, 'MMMM yyyy')}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="budgets-month-btn"
                      onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                      aria-label="Previous calendar month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="budgets-month-btn"
                      onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                      aria-label="Next calendar month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="calendar-day-name">
                      {d}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    const isCurrentM = isSameMonth(day, calendarMonth);
                    const isSel = isSameDay(day, selectedDay);
                    const isT = isToday(day);
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayItems = upcomingByDateMap[dayKey] || [];

                    return (
                      <div
                        key={dayKey}
                        className={`calendar-day-cell ${!isCurrentM ? 'outside-month' : ''} ${
                          isSel ? 'selected' : ''
                        } ${isT ? 'today' : ''}`}
                        onClick={() => setSelectedDay(day)}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="calendar-day-num">{format(day, 'd')}</span>
                        {dayItems.length > 0 && (
                          <div className="calendar-dots">
                            {dayItems.slice(0, 3).map((it, idx) => (
                              <div
                                key={idx}
                                className={`calendar-dot ${it.type}`}
                                title={`${it.name} (${formatCurrency(it.amount)})`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Day Details */}
                <div className="calendar-selected-day-items">
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    Payments on {format(selectedDay, 'EEEE, MMM d')}:
                  </div>
                  {selectedDayItems.length === 0 ? (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
                      No payments scheduled on this date.
                    </div>
                  ) : (
                    selectedDayItems.map((item, idx) => (
                      <UpcomingItemRow key={idx} item={item} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Detected For You Section (hidden if empty) ─────────────────────── */}
          {suggestions.length > 0 && (
            <div className="detected-section">
              <div className="section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                  <h2 className="section-title">Detected for you</h2>
                </div>
              </div>

              <div className="detected-cards-grid">
                {suggestions.map((sugg) => (
                  <div key={sugg.merchantKey} className="detected-card">
                    <span className="detected-card-badge">
                      Seen {sugg.occurrences} times
                    </span>

                    <div>
                      <h3 className="detected-card-title">{sugg.name}</h3>
                      <div className="detected-card-amount">
                        {formatCurrency(sugg.amount)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {' '}/ {sugg.frequency}
                        </span>
                      </div>
                      <div className="detected-card-meta">
                        Next: {formatDate(sugg.nextDate)} • {sugg.category}
                      </div>
                    </div>

                    <div className="detected-card-actions">
                      <button
                        type="button"
                        className="btn-small-track"
                        onClick={() => handleTrackSuggestion(sugg)}
                      >
                        Track this
                      </button>
                      <button
                        type="button"
                        className="btn-small-dismiss"
                        onClick={() => handleDismissSuggestion(sugg)}
                      >
                        Not recurring
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── All Recurring Section ────────────────────────────────────────── */}
          <div className="recurring-list-section">
            <div className="section-header-row">
              <h2 className="section-title">All recurring</h2>
            </div>

            {recurringData.recurring.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No recurring rules set yet. Use &ldquo;Add recurring&rdquo; or track a detected candidate.
              </div>
            ) : (
              <div className="recurring-rows-list">
                {recurringData.recurring.map((item) => {
                  const catConfig = getCategoryByName(item.category);
                  const Icon = catConfig.icon;
                  const isPaused = item.status === 'paused';

                  return (
                    <div
                      key={item._id}
                      className={`recurring-row ${isPaused ? 'paused' : ''}`}
                    >
                      <div className="recurring-row-left">
                        <div
                          className="upcoming-cat-icon"
                          style={{
                            backgroundColor: `${catConfig.color}18`,
                            color: catConfig.color,
                          }}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="recurring-row-meta">
                          <div className="recurring-row-name-group">
                            <span className="recurring-row-name">{item.name}</span>
                            <span className={`recurring-status-badge ${item.status}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="recurring-row-details">
                            <span style={{ textTransform: 'capitalize' }}>
                              {item.frequency}
                            </span>
                            <span>•</span>
                            <span>Next: {formatDate(item.nextDate)}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="recurring-row-right">
                        <span
                          className={`recurring-row-amount ${
                            item.type === 'income' ? 'income' : ''
                          }`}
                        >
                          {item.type === 'income' ? '+' : ''}
                          {formatCurrency(item.amount)}
                        </span>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            className="budget-action-btn"
                            onClick={() => handleToggleStatus(item)}
                            title={isPaused ? 'Resume payment' : 'Pause payment'}
                            aria-label={isPaused ? `Resume ${item.name}` : `Pause ${item.name}`}
                          >
                            {isPaused ? <Play size={14} /> : <Pause size={14} />}
                          </button>
                          <button
                            type="button"
                            className="budget-action-btn"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="budget-action-btn delete"
                            onClick={() => handleDeleteRecurring(item)}
                            title="Delete"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Recurring Drawer ──────────────────────────────────────── */}
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
              aria-labelledby="rec-drawer-title"
            >
              <div className="drawer-header">
                <h2 id="rec-drawer-title" className="drawer-title">
                  {editingItem ? 'Edit recurring payment' : 'Add recurring payment'}
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

              <form onSubmit={handleSaveRecurring} className="drawer-body">
                {/* Type switch */}
                <div className="type-segmented-control">
                  <button
                    type="button"
                    className={`type-segment-btn ${type === 'expense' ? 'active expense' : ''}`}
                    onClick={() => setType('expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`type-segment-btn ${type === 'income' ? 'active income' : ''}`}
                    onClick={() => setType('income')}
                  >
                    Income
                  </button>
                </div>

                {/* Name */}
                <div className="drawer-form-group">
                  <label htmlFor="rec-name" className="drawer-label">
                    Name
                  </label>
                  <input
                    id="rec-name"
                    type="text"
                    className="drawer-input"
                    placeholder="e.g. Netflix, House Rent, Internet"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Amount */}
                <div className="drawer-form-group">
                  <label htmlFor="rec-amount" className="drawer-label">
                    Amount per occurrence
                  </label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      id="rec-amount"
                      type="number"
                      step="1"
                      min="1"
                      className="currency-input"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="drawer-form-group">
                  <label htmlFor="rec-cat" className="drawer-label">
                    Category
                  </label>
                  <select
                    id="rec-cat"
                    className="drawer-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div className="drawer-form-group">
                  <label htmlFor="rec-freq" className="drawer-label">
                    Frequency
                  </label>
                  <select
                    id="rec-freq"
                    className="drawer-select"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Next Date */}
                <div className="drawer-form-group">
                  <label htmlFor="rec-date" className="drawer-label">
                    Next payment date
                  </label>
                  <input
                    id="rec-date"
                    type="date"
                    className="drawer-input"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    required
                  />
                </div>

                {formError && (
                  <span className="drawer-error-text">{formError}</span>
                )}

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
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting
                      ? 'Saving…'
                      : editingItem
                      ? 'Update payment'
                      : 'Save payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Subcomponent to render an upcoming payment row
 */
function UpcomingItemRow({ item }) {
  const catConfig = getCategoryByName(item.category);
  const Icon = catConfig.icon;

  return (
    <div className="upcoming-item-row">
      <div className="upcoming-item-left">
        <div
          className="upcoming-cat-icon"
          style={{
            backgroundColor: `${catConfig.color}18`,
            color: catConfig.color,
          }}
        >
          <Icon size={16} />
        </div>
        <div className="upcoming-item-details">
          <span className="upcoming-item-name">{item.name}</span>
          <span className="upcoming-item-date">{formatDate(item.date)}</span>
        </div>
      </div>

      <div className="upcoming-item-right">
        <span
          className={`upcoming-item-amount ${
            item.type === 'income' ? 'income' : ''
          }`}
        >
          {item.type === 'income' ? '+' : ''}
          {formatCurrency(item.amount)}
        </span>
        <span className="upcoming-relative-pill">
          {formatRelativeDue(item.date)}
        </span>
      </div>
    </div>
  );
}
