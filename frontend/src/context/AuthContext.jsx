import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check current session on application mount
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
        if (res.csrf_token) {
          setCsrfToken(res.csrf_token);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (username, password) => {
    setAuthError(null);
    try {
      const res = await api.login({ username, password });
      if (res.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await api.register(userData);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
      }
    } catch {
      setUser(null);
    }
  };

  const hasRole = (allowedRoles) => {
    if (!user || user.status !== 'APPROVED') return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(user.role);
    }
    return user.role === allowedRoles;
  };

  const value = {
    user,
    isAuthenticated: !!user && user.status === 'APPROVED',
    isPending: !!user && user.status === 'PENDING',
    isSuspended: !!user && user.status === 'SUSPENDED',
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
