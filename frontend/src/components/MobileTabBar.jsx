// components/MobileTabBar.jsx — Bottom navigation bar for mobile screens
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  CalendarSync,
  FileInput,
} from 'lucide-react';
import './MobileTabBar.css';

// Short labels for mobile tab bar
const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/recurring', label: 'Recurring', icon: CalendarSync },
  { to: '/import', label: 'Import', icon: FileInput },
];

export default function MobileTabBar() {
  return (
    <nav className="mobile-tab-bar" aria-label="Mobile Navigation">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
