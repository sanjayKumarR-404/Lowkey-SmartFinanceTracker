// components/TransactionDrawer.jsx — Slide-over drawer for manual entry and SMS parsing
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useTransactionDrawer } from '../context/TransactionDrawerContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../constants/categories';
import { createTransaction, updateTransaction, parseSms } from '../services/transactionService';
import './TransactionDrawer.css';

export default function TransactionDrawer() {
  const { isOpen, editingTransaction, initialTab, closeDrawer, triggerRefresh } =
    useTransactionDrawer();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'sms'

  // Manual form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // SMS parsing state
  const [smsText, setSmsText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [smsError, setSmsError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // Sync state when editing a transaction or opening drawer
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setActiveTab('manual');
        setType(editingTransaction.type || 'expense');
        setAmount(editingTransaction.amount ? String(editingTransaction.amount) : '');
        setMerchant(editingTransaction.merchant || '');
        setCategory(editingTransaction.category || CATEGORIES[0].name);
        setDate(
          editingTransaction.date
            ? new Date(editingTransaction.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setNote(editingTransaction.note || '');
      } else {
        setActiveTab(initialTab || 'manual');
        setType('expense');
        setAmount('');
        setMerchant('');
        setCategory(CATEGORIES[0].name);
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
      setErrors({});
      setSmsText('');
      setSmsError(null);
      setParsedData(null);
    }
  }, [isOpen, editingTransaction, initialTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  // Validate form
  const validate = () => {
    const newErrors = {};
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      newErrors.amount = 'Amount must be greater than 0.';
    }
    if (!date) {
      newErrors.date = 'Please select a date.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit manual transaction (create or update)
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        type,
        amount: parseFloat(amount),
        merchant: merchant.trim() || undefined,
        category,
        date: new Date(date).toISOString(),
        note: note.trim() || undefined,
        source: editingTransaction?.source || 'manual',
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction._id, payload);
        showToast({ message: 'Transaction updated', type: 'success' });
      } else {
        await createTransaction(payload);
        showToast({ message: 'Transaction recorded', type: 'success' });
      }

      triggerRefresh();
      closeDrawer();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save transaction.';
      showToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Call parse-sms endpoint
  const handleReadSms = async () => {
    if (!smsText.trim()) {
      setSmsError('Please paste an SMS message first.');
      return;
    }

    try {
      setParsing(true);
      setSmsError(null);
      setParsedData(null);

      const res = await parseSms(smsText.trim());
      if (res.data) {
        setParsedData({
          type: res.data.type || 'expense',
          amount: res.data.amount || '',
          merchant: res.data.merchant || '',
          category: CATEGORIES[0].name,
          date: res.data.date
            ? new Date(res.data.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          accountLast4: res.data.accountLast4 || null,
        });
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setSmsError('This does not look like a money transaction.');
      } else {
        setSmsError(err.response?.data?.message || 'Could not parse this message.');
      }
    } finally {
      setParsing(false);
    }
  };

  // Save parsed SMS transaction
  const handleSaveParsedSms = async () => {
    if (!parsedData || !parsedData.amount || parsedData.amount <= 0) {
      setSmsError('Valid amount is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        type: parsedData.type,
        amount: parseFloat(parsedData.amount),
        merchant: parsedData.merchant ? parsedData.merchant.trim() : undefined,
        category: parsedData.category,
        date: new Date(parsedData.date).toISOString(),
        note: parsedData.accountLast4 ? `A/c *${parsedData.accountLast4}` : undefined,
        source: 'sms',
      };

      await createTransaction(payload);
      showToast({ message: 'Transaction imported from SMS', type: 'success' });
      triggerRefresh();
      closeDrawer();
    } catch (err) {
      setSmsError(err.response?.data?.message || 'Could not save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={closeDrawer} role="presentation">
      <motion.div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-heading"
      >
        {/* Header */}
        <div className="drawer-header">
          <h2 id="drawer-heading" className="drawer-title">
            {editingTransaction ? 'Edit transaction' : 'Add transaction'}
          </h2>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={closeDrawer}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs: only shown when creating a new transaction */}
        {!editingTransaction && (
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual
            </button>
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'sms' ? 'active' : ''}`}
              onClick={() => setActiveTab('sms')}
            >
              Paste SMS
            </button>
          </div>
        )}

        {/* Manual Tab Body */}
        {activeTab === 'manual' ? (
          <form onSubmit={handleSubmitManual} className="drawer-body">
            {/* Segmented Expense / Income Switch */}
            <div className="type-segmented-control">
              <button
                type="button"
                className={`type-segment-btn ${type === 'expense' ? 'active expense' : ''}`}
                onClick={() => setType('expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className={`type-segment-btn ${type === 'income' ? 'active income' : ''}`}
                onClick={() => setType('income')}
              >
                Income
              </button>
            </div>

            {/* Amount Field */}
            <div className="drawer-form-group">
              <label htmlFor="tx-amount" className="drawer-label">
                Amount
              </label>
              <div className="currency-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="currency-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
                  }}
                  autoFocus
                  required
                />
              </div>
              {errors.amount && <span className="drawer-error-text">{errors.amount}</span>}
            </div>

            {/* Merchant / Payee Field */}
            <div className="drawer-form-group">
              <label htmlFor="tx-merchant" className="drawer-label">
                {type === 'income' ? 'Payer / Source' : 'Merchant / Payee'}
              </label>
              <input
                id="tx-merchant"
                type="text"
                className="drawer-input"
                placeholder={type === 'income' ? 'e.g. Salary, Client, Friend' : 'e.g. Swiggy, Uber, Amazon'}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>

            {/* Category Dropdown */}
            <div className="drawer-form-group">
              <label htmlFor="tx-category" className="drawer-label">
                Category
              </label>
              <select
                id="tx-category"
                className="drawer-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Field */}
            <div className="drawer-form-group">
              <label htmlFor="tx-date" className="drawer-label">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                className="drawer-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {errors.date && <span className="drawer-error-text">{errors.date}</span>}
            </div>

            {/* Note Field */}
            <div className="drawer-form-group">
              <label htmlFor="tx-note" className="drawer-label">
                Note (optional)
              </label>
              <textarea
                id="tx-note"
                className="drawer-textarea"
                placeholder="Add details, bill numbers, or context…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="drawer-footer" style={{ margin: 'auto -24px -24px -24px' }}>
              <button type="button" onClick={closeDrawer} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting
                  ? 'Saving…'
                  : editingTransaction
                  ? 'Update transaction'
                  : 'Save transaction'}
              </button>
            </div>
          </form>
        ) : (
          /* Paste SMS Tab Body */
          <div className="drawer-body">
            <div className="drawer-form-group">
              <label htmlFor="tx-sms-text" className="drawer-label">
                Bank SMS message
              </label>
              <textarea
                id="tx-sms-text"
                className="drawer-textarea sms-textarea"
                placeholder="Paste a bank message here (e.g. 'Rs. 450 debited from A/c **4321 on 21-Oct-26 to SWIGGY...')"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleReadSms}
              disabled={parsing || !smsText.trim()}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}
            >
              <Sparkles size={15} style={{ color: 'var(--primary)' }} />
              <span>{parsing ? 'Reading…' : 'Read message'}</span>
            </button>

            {/* Error message (e.g. 422: not a transaction) */}
            {smsError && (
              <div className="sms-notice-banner" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{smsError}</span>
              </div>
            )}

            {/* Parsed results review */}
            {parsedData && (
              <div className="sms-success-box">
                <div className="sms-success-header">
                  <CheckCircle2 size={16} />
                  <span>Transaction detected</span>
                </div>

                {/* Editable parsed fields */}
                <div className="type-segmented-control">
                  <button
                    type="button"
                    className={`type-segment-btn ${parsedData.type === 'expense' ? 'active expense' : ''}`}
                    onClick={() => setParsedData((p) => ({ ...p, type: 'expense' }))}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`type-segment-btn ${parsedData.type === 'income' ? 'active income' : ''}`}
                    onClick={() => setParsedData((p) => ({ ...p, type: 'income' }))}
                  >
                    Income
                  </button>
                </div>

                <div className="drawer-form-group">
                  <label className="drawer-label">Amount</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      className="currency-input"
                      value={parsedData.amount}
                      onChange={(e) =>
                        setParsedData((p) => ({ ...p, amount: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="drawer-form-group">
                  <label className="drawer-label">Merchant / Payee</label>
                  <input
                    type="text"
                    className="drawer-input"
                    value={parsedData.merchant}
                    placeholder="Merchant name"
                    onChange={(e) =>
                      setParsedData((p) => ({ ...p, merchant: e.target.value }))
                    }
                  />
                </div>

                <div className="drawer-form-group">
                  <label className="drawer-label">Category</label>
                  <select
                    className="drawer-select"
                    value={parsedData.category}
                    onChange={(e) =>
                      setParsedData((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="drawer-form-group">
                  <label className="drawer-label">Date</label>
                  <input
                    type="date"
                    className="drawer-input"
                    value={parsedData.date}
                    onChange={(e) =>
                      setParsedData((p) => ({ ...p, date: e.target.value }))
                    }
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleSaveParsedSms}
                    disabled={submitting}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Saving…' : 'Looks right? Save it'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
