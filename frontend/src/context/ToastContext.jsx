// context/ToastContext.jsx — Global toast notification system with Undo support
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import '../components/Toast.css';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Display a toast notification.
   * @param {object} options
   * @param {string} options.message - The text to display
   * @param {'success'|'error'|'info'} [options.type='info']
   * @param {number} [options.duration=4000] - Duration in ms before auto-dismiss
   * @param {object} [options.action] - { label: string, onClick: function }
   */
  const showToast = useCallback(({ message, type = 'info', duration = 4000, action = null }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, message, type, action };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      <div className="toast-container" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon =
              toast.type === 'success'
                ? CheckCircle2
                : toast.type === 'error'
                ? AlertCircle
                : Info;

            const iconColor =
              toast.type === 'success'
                ? 'var(--income)'
                : toast.type === 'error'
                ? 'var(--expense)'
                : 'var(--primary)';

            return (
              <motion.div
                key={toast.id}
                className={`toast-item ${toast.type}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                role="status"
              >
                <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
                <span className="toast-message">{toast.message}</span>

                {toast.action && (
                  <button
                    type="button"
                    className="toast-undo-btn"
                    onClick={() => {
                      toast.action.onClick();
                      removeToast(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}

                <button
                  type="button"
                  className="toast-close-btn"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
