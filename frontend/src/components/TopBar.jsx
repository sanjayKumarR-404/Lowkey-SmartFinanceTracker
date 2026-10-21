// components/TopBar.jsx — Top application bar
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import './TopBar.css';

const TITLES = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/recurring': 'Recurring',
  '/import': 'Import statement',
};

export default function TopBar({ onOpenCommandPalette }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { openDrawer } = useTransactionDrawer();

  const title = TITLES[location.pathname] || 'Lowkey';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="mobile-brand">
          Lowkey
          <span className="logo-dot" />
        </span>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="command-trigger-btn"
          aria-label="Open command palette"
        >
          <Search size={15} />
          <span className="command-label">Quick actions</span>
          <kbd className="kbd-badge">Ctrl K</kbd>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="mobile-theme-btn"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          onClick={() => openDrawer(null, 'manual')}
          className="btn-primary"
        >
          <Plus size={16} />
          <span>Add transaction</span>
        </button>
      </div>
    </header>
  );
}
