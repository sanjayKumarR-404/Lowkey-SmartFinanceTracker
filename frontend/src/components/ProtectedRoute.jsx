// components/ProtectedRoute.jsx — Guards private routes from unauthenticated access
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // While checking token validity, show a quiet skeleton placeholder
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        Loading Lowkey…
      </div>
    );
  }

  // If not logged in, redirect to login page while preserving target path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
