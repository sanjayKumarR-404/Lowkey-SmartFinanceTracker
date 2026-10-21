// context/AuthContext.jsx — Global authentication state and methods
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('lowkey_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lowkey_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate saved token on initial app load
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('lowkey_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('lowkey_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        // If token is expired or invalid, reset state
        console.warn('Session verification failed:', err.message);
        localStorage.removeItem('lowkey_token');
        localStorage.removeItem('lowkey_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  // Listen for 401 unauthorized events dispatched by the Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('lowkey-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('lowkey-unauthorized', handleUnauthorized);
  }, []);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('lowkey_token', newToken);
    localStorage.setItem('lowkey_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  // Register handler
  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('lowkey_token', newToken);
    localStorage.setItem('lowkey_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('lowkey_token');
    localStorage.removeItem('lowkey_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
