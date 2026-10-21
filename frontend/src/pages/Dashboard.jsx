// pages/Dashboard.jsx — Main dashboard overview
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <EmptyState
        icon={LayoutDashboard}
        title="No transactions recorded yet"
        description="Start your personal ledger by adding your first income or expense record."
        actionLabel="Add transaction"
        onAction={() => navigate('/transactions?add=true')}
      />
    </div>
  );
}
