// pages/Dashboard.jsx — Full bento-grid dashboard with 6 cards
// Uses the /api/analytics/overview endpoint and matches the Transactions page visual style.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Sector,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  ArrowRight, LayoutDashboard, AlertCircle, RotateCw, Plus,
} from 'lucide-react';
import { getOverview } from '../services/analyticsService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCategoryByName } from '../constants/categories';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import './Dashboard.css';

// Month name lookup
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
// Short names for bar chart X axis
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Count-up animation hook ──────────────────────────────────────────── */
function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const startTime = performance.now();
    const startVal = 0;
    // Cancel any previous animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(startVal + (target - startVal) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ── Hero net number with count-up ───────────────────────────────────── */
function HeroNumber({ value }) {
  const animated = useCountUp(value);
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <span className={`hero-net-amount ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
      {value > 0 ? '+' : ''}{formatCurrency(animated)}
    </span>
  );
}

/* ── Custom bar chart tooltip ─────────────────────────────────────────── */
function CashFlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.82rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton card ────────────────────────────────────────────────────── */
function SkeletonCard({ children, className = '' }) {
  return <div className={`dash-card ${className}`}>{children}</div>;
}

/* ── Main Dashboard component ─────────────────────────────────────────── */
export default function Dashboard() {
  const { openDrawer, registerRefreshListener } = useTransactionDrawer();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Donut chart hover state: which category index is highlighted
  const [hoveredCat, setHoveredCat] = useState(null);

  const month = currentDate.getMonth() + 1; // 1-12
  const year = currentDate.getFullYear();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getOverview(month, year);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh when a transaction is added/edited/deleted via the drawer
  useEffect(() => {
    const unregister = registerRefreshListener(fetchData);
    return unregister;
  }, [registerRefreshListener, fetchData]);

  const handlePrevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Determine whether there is any data at all for the empty state
  const isEmpty =
    !loading && !error && data &&
    data.summary.income === 0 && data.summary.expense === 0;

  /* ── Month Switcher (shared markup) ─────────────────────────────────── */
  const MonthSwitcher = (
    <div className="dash-month-switcher">
      <button type="button" onClick={handlePrevMonth} className="dash-month-btn" aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <span className="dash-month-label">
        {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
      </span>
      <button type="button" onClick={handleNextMonth} className="dash-month-btn" aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Top header row */}
      <div className="dash-top-header">
        <span className="dash-title">Dashboard</span>
        {MonthSwitcher}
      </div>

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && (
        <div className="bento-grid">
          <SkeletonCard className="bento-hero">
            <div className="skel skel-h1" />
            <div className="skel skel-h2" />
          </SkeletonCard>
          <SkeletonCard className="bento-cashflow">
            <div className="skel skel-p" style={{ width: '30%' }} />
            <div className="skel skel-chart" />
          </SkeletonCard>
          <SkeletonCard className="bento-category">
            <div className="skel skel-p" style={{ width: '40%' }} />
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="skel skel-circle" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(n => <div key={n} className="skel skel-p" />)}
              </div>
            </div>
          </SkeletonCard>
          <SkeletonCard className="bento-review">
            <div className="skel skel-p" style={{ width: '40%' }} />
            {[1,2,3].map(n => <div key={n} className="skel skel-p" />)}
            <div className="skel skel-p short" />
          </SkeletonCard>
          <SkeletonCard className="bento-merchants">
            <div className="skel skel-p" style={{ width: '40%' }} />
            {[1,2,3,4,5].map(n => <div key={n} style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <div className="skel skel-p" />
              <div className="skel skel-bar" />
            </div>)}
          </SkeletonCard>
          <SkeletonCard className="bento-recent">
            <div className="skel skel-p" style={{ width: '40%' }} />
            {[1,2,3,4,5,6].map(n => <div key={n} className="skel skel-p" />)}
          </SkeletonCard>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="bento-grid">
          <div className="dash-error">
            <AlertCircle size={32} style={{ color: 'var(--expense)' }} />
            <h3>Could not load dashboard</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4 }}
            >
              <RotateCw size={15} /> Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="bento-grid">
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <LayoutDashboard size={26} />
            </div>
            <h3>Nothing recorded yet</h3>
            <p>
              Add your first income or expense to see your{' '}
              {MONTH_NAMES[currentDate.getMonth()]} overview come to life.
            </p>
            <button
              type="button"
              onClick={() => openDrawer(null, 'manual')}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} /> Add transaction
            </button>
          </div>
        </div>
      )}

      {/* ── Full bento grid (data loaded and non-empty) ──────────────────── */}
      {!loading && !error && data && !isEmpty && (
        <div className="bento-grid">
          {/* ── CARD 1: Hero "Net this month" ─────────────────────────── */}
          <HeroCard data={data} />

          {/* ── CARD 2: Cash flow bar chart ───────────────────────────── */}
          <CashFlowCard trend={data.monthlyTrend} />

          {/* ── CARD 3: Spending by category (donut) ─────────────────── */}
          <CategoryCard
            breakdown={data.categoryBreakdown}
            hoveredCat={hoveredCat}
            setHoveredCat={setHoveredCat}
          />

          {/* ── CARD 4: Month in review ───────────────────────────────── */}
          <ReviewCard data={data} monthName={MONTH_NAMES[currentDate.getMonth()]} />

          {/* ── CARD 5: Top merchants ─────────────────────────────────── */}
          <MerchantsCard merchants={data.topMerchants} />

          {/* ── CARD 6: Recent transactions ───────────────────────────── */}
          <RecentCard transactions={data.recent} openDrawer={openDrawer} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── CARD COMPONENTS ────────────────────────────────── */

/* Hero card: net savings with count-up, income / expense / saved% stats */
function HeroCard({ data }) {
  const { summary, previousMonth } = data;
  const net = summary.net;
  const prevNet = previousMonth.net;
  // Difference vs last month in rupees
  const diff = net - prevNet;
  const isUp = diff >= 0;
  const savedPct =
    summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : 0;

  return (
    <div className="dash-card bento-hero hero-card">
      <div className="hero-left">
        <span className="dash-card-label">Net this month</span>
        <HeroNumber value={net} />
        <div className="hero-comparison">
          {isUp
            ? <TrendingUp size={14} className="up" />
            : <TrendingDown size={14} className="down" />
          }
          <span>
            <strong className={isUp ? 'up' : 'down'}>
              {isUp ? '+' : ''}{formatCurrency(diff)}
            </strong>{' '}
            vs last month
          </span>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-stat">
          <span className="hero-stat-label">Income</span>
          <span className="hero-stat-value income">{formatCurrency(summary.income)}</span>
        </div>
        <div className="hero-divider" />
        <div className="hero-stat">
          <span className="hero-stat-label">Expenses</span>
          <span className="hero-stat-value expense">{formatCurrency(summary.expense)}</span>
        </div>
        <div className="hero-divider" />
        <div className="hero-stat">
          <span className="hero-stat-label">Saved</span>
          <span className="hero-stat-value saved">{savedPct}%</span>
        </div>
      </div>
    </div>
  );
}

/* Cash flow: 6-month bar chart */
function CashFlowCard({ trend }) {
  const chartData = trend.map((t) => ({
    name: MONTH_SHORT[t.month - 1],
    Income: t.income,
    Expenses: t.expense,
  }));

  return (
    <div className="dash-card bento-cashflow">
      <span className="dash-card-label">Cash flow</span>
      <div className="cashflow-chart-wrap" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="30%" barGap={4}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CashFlowTooltip />} cursor={{ fill: 'var(--bg-muted)' }} />
            <Bar dataKey="Income" fill="var(--income)" radius={[4,4,0,0]} isAnimationActive={true} animationDuration={700} />
            <Bar dataKey="Expenses" fill="var(--expense)" opacity={0.75} radius={[4,4,0,0]} isAnimationActive={true} animationDuration={700} animationBegin={150} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Category donut with hoverable legend */
function CategoryCard({ breakdown, hoveredCat, setHoveredCat }) {
  const total = breakdown.reduce((s, c) => s + c.total, 0);

  // Map breakdown entries to chart data with colors
  const chartData = breakdown.map((c) => {
    const cat = getCategoryByName(c.category);
    return { name: c.category, value: c.total, color: cat.color };
  });

  // Custom active shape that highlights hovered slice
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };

  const activeIndex = hoveredCat !== null
    ? chartData.findIndex((_, i) => i === hoveredCat)
    : undefined;

  if (breakdown.length === 0) {
    return (
      <div className="dash-card bento-category">
        <span className="dash-card-label">Spending by category</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 'auto 0' }}>
          No expense data yet for this month.
        </p>
      </div>
    );
  }

  return (
    <div className="dash-card bento-category">
      <span className="dash-card-label">Spending by category</span>
      <div className="donut-and-legend">
        <div className="donut-wrap">
          <PieChart width={130} height={130}>
            <Pie
              data={chartData}
              cx={60} cy={60}
              innerRadius={38}
              outerRadius={58}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={600}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, idx) => setHoveredCat(idx)}
              onMouseLeave={() => setHoveredCat(null)}
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
          <div className="donut-center-label">
            <span className="center-amount">{formatCurrency(total)}</span>
            <span className="center-sub">spent</span>
          </div>
        </div>

        <div className="donut-legend">
          {chartData.slice(0, 7).map((item, idx) => (
            <div
              key={idx}
              className={`legend-item ${hoveredCat === idx ? 'highlighted' : ''}`}
              onMouseEnter={() => setHoveredCat(idx)}
              onMouseLeave={() => setHoveredCat(null)}
            >
              <span className="legend-dot" style={{ background: item.color }} />
              <span className="legend-name">{item.name}</span>
              <span className="legend-pct">{Math.round((item.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Month in review: 2-3 sentences generated from real numbers */
function ReviewCard({ data, monthName }) {
  const { summary, previousMonth, categoryBreakdown, topMerchants } = data;

  const lines = [];

  if (summary.expense === 0) {
    lines.push(`No expenses recorded for ${monthName} yet. Add transactions to see insights here.`);
  } else {
    // Biggest category
    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0];
      lines.push(
        `Your biggest spend this month was <strong>${top.category}</strong> at ${formatCurrency(top.total)}.`
      );
    }

    // Spending vs last month
    if (previousMonth.expense > 0) {
      const diff = summary.expense - previousMonth.expense;
      const pct = Math.round(Math.abs(diff / previousMonth.expense) * 100);
      if (diff > 0) {
        lines.push(`You spent <strong>${pct}% more</strong> than last month (${formatCurrency(diff)} extra).`);
      } else if (diff < 0) {
        lines.push(`You saved <strong>${pct}% more</strong> vs last month — ${formatCurrency(Math.abs(diff))} less spent.`);
      } else {
        lines.push(`Your spending is the same as last month.`);
      }
    } else {
      // No previous month data
      lines.push(`Total expenses for ${monthName}: ${formatCurrency(summary.expense)}.`);
    }

    // Top merchant
    if (topMerchants.length > 0) {
      const m = topMerchants[0];
      lines.push(
        `You visited <strong>${m.merchant}</strong> the most, spending ${formatCurrency(m.total)} across ${m.count} transaction${m.count === 1 ? '' : 's'}.`
      );
    }
  }

  return (
    <div className="dash-card bento-review">
      <span className="dash-card-label">Month in review</span>
      <p className="review-text">
        {lines.map((line, i) => (
          <span key={i}>
            {/* dangerouslySetInnerHTML to allow bold tags — strings are built from our own numbers, not user input */}
            <span dangerouslySetInnerHTML={{ __html: line }} />
            {i < lines.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}

/* Top merchants: ranked list with proportional bar */
function MerchantsCard({ merchants }) {
  if (merchants.length === 0) {
    return (
      <div className="dash-card bento-merchants">
        <span className="dash-card-label">Top merchants</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 'auto 0' }}>
          No merchant data for this month.
        </p>
      </div>
    );
  }
  const maxTotal = merchants[0].total; // sorted largest first

  return (
    <div className="dash-card bento-merchants">
      <span className="dash-card-label">Top merchants</span>
      <div className="merchant-list">
        {merchants.map((m, i) => (
          <div key={m.merchant} className="merchant-item">
            <div className="merchant-row">
              <span className="merchant-rank">#{i + 1}</span>
              <span className="merchant-name">{m.merchant}</span>
              <span className="merchant-amount">{formatCurrency(m.total)}</span>
            </div>
            <div className="merchant-bar-track">
              <div
                className="merchant-bar-fill"
                style={{ width: `${(m.total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Recent transactions: 6 newest rows in Transactions style + "View all" */
function RecentCard({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="dash-card bento-recent">
        <span className="dash-card-label">Recent transactions</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 'auto 0' }}>
          No transactions recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="dash-card bento-recent">
      <span className="dash-card-label">Recent transactions</span>
      <div className="recent-list">
        {transactions.map((tx) => {
          const cat = getCategoryByName(tx.category);
          const CatIcon = cat.icon;
          const isIncome = tx.type === 'income';

          return (
            <div key={tx._id} className="recent-row">
              <div
                className="recent-icon"
                style={{ background: `${cat.color}18`, color: cat.color }}
              >
                <CatIcon size={15} />
              </div>
              <div className="recent-info">
                <div className="recent-merchant">
                  {tx.merchant || tx.note || 'Untitled'}
                </div>
                <div className="recent-date">{formatDate(tx.date)}</div>
              </div>
              <span className={`recent-amount ${isIncome ? 'income' : 'expense'}`}>
                {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <Link to="/transactions" className="recent-view-all">
        View all <ArrowRight size={13} />
      </Link>
    </div>
  );
}
