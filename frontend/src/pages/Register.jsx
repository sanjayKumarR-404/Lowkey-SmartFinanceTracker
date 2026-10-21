// pages/Register.jsx — Calm, human-designed two-column registration page
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      await register(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Unable to create account. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Column: Registration Form */}
      <div className="auth-form-column">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-logo">
              Lowkey
              <span className="logo-dot" />
            </span>
          </div>

          <h2 className="auth-heading">Create account</h2>
          <p className="auth-subtitle">
            Start tracking your personal finances with calm and discipline.
          </p>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder="Sanjay Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="sanjay@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Password (min 8 characters)
              </label>
              <div className="form-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="auth-submit-btn"
            >
              <span>{submitting ? 'Creating account…' : 'Create account'}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Preview */}
      <div className="auth-preview-column" aria-hidden="true">
        <div className="preview-card-wrapper">
          <div className="preview-badge">Lowkey Ledger</div>

          <div className="preview-card">
            <div className="preview-card-header">
              <span className="preview-card-title">Monthly summary</span>
              <span className="preview-card-date">October 2026</span>
            </div>

            <div className="preview-card-amount">₹84,250.00</div>

            <div className="preview-chart-container">
              <svg
                viewBox="0 0 320 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
              >
                <path
                  d="M0 65 L40 58 L80 62 L120 48 L160 52 L200 35 L240 40 L280 22 L320 18 L320 80 L0 80 Z"
                  fill="var(--primary-soft)"
                  opacity="0.6"
                />
                <path
                  d="M0 65 L40 58 L80 62 L120 48 L160 52 L200 35 L240 40 L280 22 L320 18"
                  stroke="var(--primary)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="320" cy="18" r="3.5" fill="var(--primary)" />
              </svg>
            </div>

            <div className="preview-tx-list">
              <div className="preview-tx-item">
                <div className="preview-tx-left">
                  <span
                    className="preview-tx-dot"
                    style={{ backgroundColor: 'var(--expense)' }}
                  />
                  <span className="preview-tx-title">Swiggy</span>
                </div>
                <span
                  className="preview-tx-amount"
                  style={{ color: 'var(--expense)' }}
                >
                  -₹420.00
                </span>
              </div>

              <div className="preview-tx-item">
                <div className="preview-tx-left">
                  <span
                    className="preview-tx-dot"
                    style={{ backgroundColor: 'var(--income)' }}
                  />
                  <span className="preview-tx-title">Salary credit</span>
                </div>
                <span
                  className="preview-tx-amount"
                  style={{ color: 'var(--income)' }}
                >
                  +₹65,000.00
                </span>
              </div>

              <div className="preview-tx-item">
                <div className="preview-tx-left">
                  <span
                    className="preview-tx-dot"
                    style={{ backgroundColor: 'var(--expense)' }}
                  />
                  <span className="preview-tx-title">BookMyShow</span>
                </div>
                <span
                  className="preview-tx-amount"
                  style={{ color: 'var(--expense)' }}
                >
                  -₹500.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
