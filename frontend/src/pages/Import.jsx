// pages/Import.jsx — Bank statement CSV and SMS parser import view
import React from 'react';
import { FileInput } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Import() {
  return (
    <div>
      <EmptyState
        icon={FileInput}
        title="No statements imported yet"
        description="Import your bank account statement CSV or paste raw bank SMS text to log transactions automatically."
        actionLabel="Import statement"
        onAction={() => alert('Statement import flow will be available in the upcoming task.')}
      />
    </div>
  );
}
