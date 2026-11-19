import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState(null);

  async function refreshStatus() {
    const status = await api('/auth/status');
    setSetupStatus(status);
    return status;
  }

  async function refreshMe() {
    const data = await api('/auth/me');
    setUser(data.user);
    setCompany(data.company);
    return data;
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshStatus();
        if (getToken()) {
          await refreshMe();
        }
      } catch (err) {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    await refreshStatus();
    return data;
  }

  async function firstRunSetup(payload) {
    const data = await api('/auth/first-run-setup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    await refreshStatus();
    return data;
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setCompany(null);
  }

  async function changePassword(currentPassword, newPassword) {
    const data = await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setToken(data.token);
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