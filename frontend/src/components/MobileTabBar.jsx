// components/MobileTabBar.jsx — Bottom navigation bar for mobile screens
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
} from 'lucide-react';
import './MobileTabBar.css';

// Only show pages that are fully built
const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: ArrowLeftRight },
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
