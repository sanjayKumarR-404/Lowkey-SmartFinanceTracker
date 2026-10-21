// components/Sidebar.jsx — Desktop navigation sidebar
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  CalendarSync,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

// Active navigation items
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/recurring', label: 'Recurring', icon: CalendarSync },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const userInitial = user?.name ? user.name.charAt(0) : 'U';

  return (
    <aside className="sidebar" aria-label="Main Navigation">
      <div className="sidebar-header">
        <span className="sidebar-logo">
          Lowkey
          <span className="logo-dot" />
        </span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          onClick={toggleTheme}
          className="sidebar-footer-btn"
          aria-label="Toggle theme"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            {theme}
          </span>
        </button>

        {user && (
          <div className="user-profile">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="logout-icon-btn"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
