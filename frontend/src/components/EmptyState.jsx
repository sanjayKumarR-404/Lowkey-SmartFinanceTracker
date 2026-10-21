// components/EmptyState.jsx — Clean, human-designed empty state with one clear sentence and one action
import React from 'react';
import './EmptyState.css';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state-card">
      {Icon && (
        <div className="empty-state-icon-wrapper">
          <Icon size={24} />
        </div>
      )}
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="empty-state-action">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
