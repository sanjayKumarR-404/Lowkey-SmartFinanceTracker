// components/CommandPalette.jsx — Keyboard-first quick action modal (Ctrl+K)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  CalendarSync,
  FileInput,
  Plus,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { logout } = useAuth();
  const { openDrawer } = useTransactionDrawer();

  // All available palette commands
  const allActions = [
    {
      id: 'dash',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      category: 'Navigation',
      run: () => navigate('/'),
    },
    {
      id: 'tx',
      label: 'Go to Transactions',
      icon: ArrowLeftRight,
      category: 'Navigation',
      run: () => navigate('/transactions'),
    },
    {
      id: 'budgets',
      label: 'Go to Budgets',
      icon: PieChart,
      category: 'Navigation',
      run: () => navigate('/budgets'),
    },
    {
      id: 'recurring',
      label: 'Go to Recurring payments',
      icon: CalendarSync,
      category: 'Navigation',
      run: () => navigate('/recurring'),
    },
    {
      id: 'import',
      label: 'Go to Import bank statement',
      icon: FileInput,
      category: 'Navigation',
      run: () => navigate('/import'),
    },
    {
      id: 'add-tx',
      label: 'Add a new transaction',
      icon: Plus,
      category: 'Actions',
      run: () => openDrawer(null, 'manual'),
    },
    {
      id: 'theme',
      label: isDark ? 'Switch to Light theme' : 'Switch to Dark theme',
      icon: isDark ? Sun : Moon,
      category: 'Preferences',
      run: () => toggleTheme(),
    },
    {
      id: 'logout',
      label: 'Log out of Lowkey',
      icon: LogOut,
      category: 'Account',
      run: () => logout(),
    },
  ];

  // Filter based on input
  const filtered = allActions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="palette-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="palette-search-box">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command or navigate…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="palette-empty">No matching actions found</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="palette-item-left">
                    <Icon className="palette-item-icon" />
                    <span>{item.label}</span>
                  </div>
                  <span className="palette-item-badge">{item.category}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="palette-footer">
          <span>Navigation</span>
          <div className="palette-shortcuts">
            <span>↑↓ to select</span>
            <span>↵ to execute</span>
            <span>esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
