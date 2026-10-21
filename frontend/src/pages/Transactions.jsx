// pages/Transactions.jsx — Full-featured transaction ledger with month switching, filters, and safe undo delete
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import {
  listTransactions,
  getTransactionSummary,
  deleteTransaction,
} from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CATEGORIES, getCategoryByName } from '../constants/categories';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import './Transactions.css';

// Month names lookup
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Animated number counter component that smoothly rolls up to target amount.
 */
function AnimatedCounter({ value, showSign = false, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    const startVal = 0;
    const endVal = value;
    const duration = 500; // ms

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuad curve
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(startVal + (endVal - startVal) * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return (
    <span className={`tabular-numbers ${className}`}>
      {formatCurrency(displayValue, showSign)}
    </span>
  );
}

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDrawer, registerRefreshListener } = useTransactionDrawer();
  const { showToast } = useToast();

  // Current selected month and year
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // Filters state
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  // Pending deletion timeouts for Undo support
  const pendingDeletes = useRef(new Map());

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset page on new search
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Handle ?add=true URL query parameter
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      openDrawer(null, 'manual');
      // Remove query param without triggering full reload
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, openDrawer]);

  const monthNum = currentDate.getMonth() + 1;
  const yearNum = currentDate.getFullYear();

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    try {
      const res = await getTransactionSummary({ month: monthNum, year: yearNum });
      setSummary({
        income: res.income || 0,
        expense: res.expense || 0,
        net: res.net || 0,
        count: res.count || 0,
      });
    } catch (err) {
      console.warn('Could not load summary:', err.message);
    }
  }, [monthNum, yearNum]);

  // Fetch transactions list
  const fetchTransactions = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (targetPage === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const params = {
          month: monthNum,
          year: yearNum,
          page: targetPage,
          limit: 20,
        };

        if (typeFilter !== 'all') {
          params.type = typeFilter;
        }
        if (categoryFilter !== 'all') {
          params.category = categoryFilter;
        }
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        const res = await listTransactions(params);

        if (append) {
          setTransactions((prev) => [...prev, ...(res.transactions || [])]);
        } else {
          setTransactions(res.transactions || []);
        }

        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load transactions.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [monthNum, yearNum, typeFilter, categoryFilter, debouncedSearch]
  );

  // Load data when month or filters change
  useEffect(() => {
    fetchSummary();
    fetchTransactions(1, false);
  }, [fetchSummary, fetchTransactions]);

  // Refresh data when transactions are created or updated via the drawer
  useEffect(() => {
    const unregister = registerRefreshListener(() => {
      fetchSummary();
      fetchTransactions(1, false);
    });
    return unregister;
  }, [registerRefreshListener, fetchSummary, fetchTransactions]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setPage(1);
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setPage(1);
  };

  // Safe delete with 5-second Undo
  const handleDeleteTransaction = (tx) => {
    // 1. Immediately remove from local UI list
    setTransactions((prev) => prev.filter((item) => item._id !== tx._id));

    // 2. Set 5-second timer before calling actual backend delete
    const timerId = setTimeout(async () => {
      pendingDeletes.current.delete(tx._id);
      try {
        await deleteTransaction(tx._id);
        fetchSummary();
      } catch (err) {
        showToast({
          message: 'Failed to delete transaction on server.',
          type: 'error',
        });
        // Restore if backend failed
        setTransactions((prev) => [tx, ...prev]);
      }
    }, 5000);

    pendingDeletes.current.set(tx._id, { timerId, tx });

    // 3. Show toast with Undo action
    showToast({
      message: 'Transaction deleted',
      type: 'info',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          // Cancel scheduled deletion
          if (pendingDeletes.current.has(tx._id)) {
            clearTimeout(pendingDeletes.current.get(tx._id).timerId);
            pendingDeletes.current.delete(tx._id);
          }
          // Restore transaction in list
          setTransactions((prev) => {
            const restored = [...prev, tx];
            return restored.sort((a, b) => new Date(b.date) - new Date(a.date));
          });
          showToast({ message: 'Deletion undone', type: 'success' });
        },
      },
    });
  };

  // Group transactions by human-friendly date string: "Today", "Yesterday", or "21 Oct 2026"
  const groupedTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = yDate.toISOString().split('T')[0];

    const groups = {};

    transactions.forEach((tx) => {
      const txDateStr = new Date(tx.date).toISOString().split('T')[0];
      let groupLabel;

      if (txDateStr === todayStr) {
        groupLabel = 'Today';
      } else if (txDateStr === yesterdayStr) {
        groupLabel = 'Yesterday';
      } else {
        groupLabel = formatDate(tx.date);
      }

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(tx);
    });

    return groups;
  }, [transactions]);

  return (
    <div className="transactions-container">
      {/* Top Header & Month Switcher */}
      <div className="tx-top-header">
        <div className="month-switcher">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="month-nav-btn"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="current-month-label">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="month-nav-btn"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => openDrawer(null, 'manual')}
          className="btn-primary"
        >
          <Plus size={16} />
          <span>Add transaction</span>
        </button>
      </div>

      {/* Summary Strip: Income, Expenses, Net */}
      <div className="summary-strip">
        <div className="summary-card">
          <span className="summary-label">
            <TrendingUp size={15} style={{ color: 'var(--income)' }} />
            <span>Monthly income</span>
          </span>
          <div className="summary-amount income">
            <AnimatedCounter value={summary.income} showSign={false} />
          </div>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            <TrendingDown size={15} style={{ color: 'var(--expense)' }} />
            <span>Monthly expenses</span>
          </span>
          <div className="summary-amount expense">
            <AnimatedCounter value={summary.expense} showSign={false} />
          </div>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            <Scale size={15} style={{ color: 'var(--primary)' }} />
            <span>Net savings</span>
          </span>
          <div
            className={`summary-amount ${
              summary.net > 0
                ? 'net-positive'
                : summary.net < 0
                ? 'net-negative'
                : ''
            }`}
          >
            <AnimatedCounter value={summary.net} showSign={summary.net > 0} />
          </div>
        </div>
      </div>

      {/* Filter Row: Type segmented, Category select, Search box */}
      <div className="filter-row">
        <div className="filter-left-controls">
          {/* Segmented Type Control */}
          <div className="filter-segmented">
            <button
              type="button"
              className={`segmented-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('all');
                setPage(1);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`segmented-btn ${typeFilter === 'expense' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('expense');
                setPage(1);
              }}
            >
              Expenses
            </button>
            <button
              type="button"
              className={`segmented-btn ${typeFilter === 'income' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('income');
                setPage(1);
              }}
            >
              Income
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            className="category-select-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search input with 300ms debounce */}
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon-inside" />
          <input
            type="text"
            className="search-input"
            placeholder="Search merchant or note…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        /* Soft Shimmer Skeleton Rows */
        <div className="tx-group-card">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="skeleton-row">
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div className="skeleton-circle" />
                <div className="skeleton-text-group">
                  <div className="skeleton-bar-long" />
                  <div className="skeleton-bar-short" />
                </div>
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State with Try Again */
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <AlertCircle
            size={28}
            style={{ color: 'var(--expense)', margin: '0 auto 12px auto' }}
          />
          <h3 style={{ marginBottom: '8px' }}>Unable to load transactions</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => fetchTransactions(1, false)}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCw size={15} />
            <span>Try again</span>
          </button>
        </div>
      ) : transactions.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={TrendingUp}
          title="No transactions found"
          description={
            debouncedSearch || categoryFilter !== 'all' || typeFilter !== 'all'
              ? 'No transactions matched your active filters. Try adjusting your search or category.'
              : `You haven't recorded any transactions in ${
                  MONTH_NAMES[currentDate.getMonth()]
                } ${currentDate.getFullYear()}.`
          }
          actionLabel="Add transaction"
          onAction={() => openDrawer(null, 'manual')}
        />
      ) : (
        /* Grouped Transactions List */
        <div className="tx-groups">
          <AnimatePresence>
            {Object.entries(groupedTransactions).map(([dateLabel, groupItems]) => (
              <motion.div
                key={dateLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="tx-group-header">
                  <span>{dateLabel}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-subtle)' }}>
                    {groupItems.length} {groupItems.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                <div className="tx-group-card">
                  {groupItems.map((tx) => {
                    const categoryObj = getCategoryByName(tx.category);
                    const CategoryIcon = categoryObj.icon;
                    const isIncome = tx.type === 'income';

                    return (
                      <div key={tx._id} className="tx-row">
                        <div className="tx-row-left">
                          <div
                            className="tx-cat-icon-badge"
                            style={{
                              backgroundColor: `${categoryObj.color}18`,
                              color: categoryObj.color,
                            }}
                          >
                            <CategoryIcon size={18} />
                          </div>

                          <div className="tx-meta">
                            <div className="tx-merchant">
                              <span>{tx.merchant || tx.note || 'Untitled'}</span>
                              {tx.source === 'sms' && (
                                <span className="sms-pill-tag">SMS</span>
                              )}
                            </div>
                            <div className="tx-details">
                              <span>{tx.category}</span>
                              {tx.merchant && tx.note && (
                                <>
                                  <span>•</span>
                                  <span className="tx-note-snippet">{tx.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="tx-row-right">
                          <div className={`tx-amount ${isIncome ? 'income' : ''}`}>
                            {isIncome
                              ? `+${formatCurrency(tx.amount)}`
                              : formatCurrency(tx.amount)}
                          </div>

                          {/* Hover action buttons */}
                          <div className="tx-row-actions">
                            <button
                              type="button"
                              onClick={() => openDrawer(tx, 'manual')}
                              className="tx-action-btn"
                              title="Edit transaction"
                              aria-label="Edit transaction"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx)}
                              className="tx-action-btn delete"
                              title="Delete transaction"
                              aria-label="Delete transaction"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load More Button */}
          {page < totalPages && (
            <div className="load-more-container">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchTransactions(page + 1, true)}
                className="load-more-btn"
              >
                {loadingMore ? 'Loading more…' : 'Show more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
