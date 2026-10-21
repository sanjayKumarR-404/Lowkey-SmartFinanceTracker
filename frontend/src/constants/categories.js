// constants/categories.js — Single source of truth for categories in Lowkey
// Uses muted, earthy colors from the design guide. Never neon or saturated.

import {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  Home,
  Film,
  HeartPulse,
  GraduationCap,
  Plane,
  RotateCw,
  Banknote,
  ArrowLeftRight,
  MoreHorizontal,
} from 'lucide-react';

export const CATEGORIES = [
  { name: 'Food & dining', color: '#8E5B42', icon: Utensils },
  { name: 'Groceries', color: '#5A7D54', icon: ShoppingCart },
  { name: 'Transport', color: '#4F7359', icon: Car },
  { name: 'Shopping', color: '#7D6587', icon: ShoppingBag },
  { name: 'Bills & utilities', color: '#3C6E71', icon: Zap },
  { name: 'Rent', color: '#936B4F', icon: Home },
  { name: 'Entertainment', color: '#A3704C', icon: Film },
  { name: 'Health', color: '#5B7B88', icon: HeartPulse },
  { name: 'Education', color: '#5D7052', icon: GraduationCap },
  { name: 'Travel', color: '#4A6B82', icon: Plane },
  { name: 'Subscriptions', color: '#6B5B7B', icon: RotateCw },
  { name: 'Salary', color: '#2D7A58', icon: Banknote },
  { name: 'Transfers', color: '#586A7A', icon: ArrowLeftRight },
  { name: 'Other', color: '#727A75', icon: MoreHorizontal },
];

/**
 * Lookup helper to retrieve category configuration by name.
 * Falls back to 'Other' if not found.
 */
export function getCategoryByName(name) {
  if (!name) return CATEGORIES[CATEGORIES.length - 1];
  const found = CATEGORIES.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase()
  );
  return found || CATEGORIES[CATEGORIES.length - 1];
}
