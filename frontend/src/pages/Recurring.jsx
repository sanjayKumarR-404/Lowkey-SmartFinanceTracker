// pages/Recurring.jsx — Recurring payments and recurring subscriptions
import React from 'react';
import { CalendarSync } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Recurring() {
  return (
    <div>
      <EmptyState
        icon={CalendarSync}
        title="No recurring payments tracked"
        description="Keep tabs on subscriptions, rent, and bills that renew on a regular weekly or monthly cycle."
        actionLabel="Track recurring payment"
        onAction={() => alert('Recurring payment modal will be available in the upcoming task.')}
      />
    </div>
  );
}
