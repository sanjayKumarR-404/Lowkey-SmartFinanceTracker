// pages/Transactions.jsx — Transaction history and management
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Transactions() {
  const navigate = useNavigate();

  return (
    <div>
      <EmptyState
        icon={ArrowLeftRight}
        title="No transaction history"
        description="When you record manual transactions or import bank statements, they will appear here in chronological order."
        actionLabel="Record transaction"
        onAction={() => navigate('/transactions?add=true')}
      />
    </div>
  );
}
