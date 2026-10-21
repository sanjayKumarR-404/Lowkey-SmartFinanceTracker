// context/TransactionDrawerContext.jsx — Global controller for Add / Edit transaction drawer
import React, { createContext, useContext, useState, useCallback } from 'react';

const TransactionDrawerContext = createContext();

export function TransactionDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [initialTab, setInitialTab] = useState('manual');
  const [refreshCallbacks, setRefreshCallbacks] = useState([]);

  /**
   * Open drawer for either creating a new transaction or editing an existing one.
   * @param {object|null} [transaction=null] - Transaction object if editing, null if creating
   * @param {'manual'|'sms'} [tab='manual'] - Initial tab to display
   */
  const openDrawer = useCallback((transaction = null, tab = 'manual') => {
    setEditingTransaction(transaction);
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setEditingTransaction(null);
  }, []);

  /**
   * Register a callback function (e.g. from Transactions page) to be notified
   * whenever a transaction is created, updated, or deleted.
   */
  const registerRefreshListener = useCallback((cb) => {
    setRefreshCallbacks((prev) => [...prev, cb]);
    return () => {
      setRefreshCallbacks((prev) => prev.filter((item) => item !== cb));
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    refreshCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Refresh callback error:', err);
      }
    });
  }, [refreshCallbacks]);

  return (
    <TransactionDrawerContext.Provider
      value={{
        isOpen,
        editingTransaction,
        initialTab,
        openDrawer,
        closeDrawer,
        triggerRefresh,
        registerRefreshListener,
      }}
    >
      {children}
    </TransactionDrawerContext.Provider>
  );
}

export function useTransactionDrawer() {
  const context = useContext(TransactionDrawerContext);
  if (!context) {
    throw new Error('useTransactionDrawer must be used within a TransactionDrawerProvider');
  }
  return context;
}
