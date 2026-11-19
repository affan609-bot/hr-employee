import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, getAuthToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState(null);

  async function refreshStatus() {
    try {
      const status = await api.getSystemStatus();
      setSetupStatus(status);
      return status;
    } catch (err) {
      console.warn('System status check warning:', err.message);
      // Fallback: assume system needs setup if status check fails
      const fallback = { isSetup: false };
      setSetupStatus(fallback);
      return fallback;
    }
  }

  async function refreshMe() {
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
      setCompany(data.company);
      return data;
    } catch (err) {
      setAuthToken(null);
      setUser(null);
      throw err;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshStatus();
        if (getAuthToken()) {
          await refreshMe();
        }
      } catch (err) {
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    setAuthToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    await refreshStatus();
    return data;
  }

  async function firstRunSetup(payload) {
    const data = await api.firstRunSetup(payload);
    setAuthToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    await refreshStatus();
    return data;
  }

  async function logout() {
    setAuthToken(null);
    setUser(null);
    setCompany(null);
  }

  async function changePassword(currentPassword, newPassword) {
    const data = await api.changePassword({ currentPassword, newPassword });
    setAuthToken(data.token);
    await refreshMe();
    return data;
  }

  const isSetup = setupStatus?.isSetup ?? false;
  const value = useMemo(() => ({
    user, company, loading, setupStatus, isSetup, refreshStatus, refreshMe,
    login, firstRunSetup, logout, changePassword
  }), [user, company, loading, setupStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
