// pages/Budgets.jsx — Monthly category budgets
import React from 'react';
import { PieChart } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Budgets() {
  return (
    <div>
      <EmptyState
        icon={PieChart}
        title="No monthly budgets set"
        description="Set monthly spending targets for categories like Food, Utilities, or Shopping to stay in control of your budget."
        actionLabel="Create budget"
        onAction={() => alert('Budget creation modal will be available in the upcoming task.')}
      />
    </div>
  );
}
