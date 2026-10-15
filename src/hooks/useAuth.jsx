import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login, register, logout, updateProfile, changePassword, verifyLogin2Fa } from '../api/auth';

import { clearTenantStorage } from '../lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const data = await getMe();
          setUser(data.user);
          setLoading(false);
          return;
        } catch (err) {
          // If error is transient (e.g. backend restarting, 502/503/504, network glitch), retry before logging out
          const isTransient = !err.status || [502, 503, 504].includes(err.status) || err.code === 'HTTP_ERROR' || err.message?.includes('Failed to fetch');
          if (isTransient && attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          // Real 401 or unrecoverable error
          setUser(null);
          break;
        }
      }
      setLoading(false);
    }
    checkAuth();

    const handleLogoutSync = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pm_token');
        localStorage.removeItem('pm_token');
      }
      setUser(null);
      const publicPaths = ['/login', '/register', '/invite', '/forgot-password', '/reset-password'];
      const isPublicPage = typeof window !== 'undefined' && publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublicPage && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'pm_auth_logout') {
        handleLogoutSync();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('pm_auth_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            handleLogoutSync();
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  const loginUser = async (email, password, tenant_slug) => {
    setError(null);
    try {
      const data = await login(email, password, tenant_slug);
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const verify2FaLogin = async (tempToken, code) => {
    setError(null);
    try {
      const data = await verifyLogin2Fa(tempToken, code);
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.message || '2FA verification failed');
      throw err;
    }
  };

  const registerUser = async (name, email, password, inviteToken, companyName, verificationToken) => {
    setError(null);
    try {
      const data = await register(name, email, password, inviteToken, companyName, verificationToken);
      if (data.initial_workspace_id) {
        localStorage.setItem('activeWorkspaceId', data.initial_workspace_id);
      }
      if (data.initial_board_id) {
        localStorage.setItem('activeBoardId', data.initial_board_id);
      }
      setUser(data.user);
      return { ...data.user, initial_workspace_id: data.initial_workspace_id, initial_board_id: data.initial_board_id };
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logoutUser = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pm_token');
        localStorage.removeItem('pm_token');
      }
      if (user?.tenant_id) {
        clearTenantStorage(user.tenant_id);
      }
      localStorage.setItem('pm_auth_logout', Date.now().toString());
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('pm_auth_sync');
          bc.postMessage({ type: 'LOGOUT' });
          bc.close();
        } catch (e) {}
      }
      setUser(null);
    }
  };

  const updateUserProfile = async (profileData) => {
    setError(null);
    try {
      // Handle both (name, email) and ({ name, email, timezone, locale, avatar_url })
      const payload = typeof profileData === 'object' ? profileData : { name: arguments[0], email: arguments[1] };
      const data = await updateProfile(payload);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const refreshUser = async () => {
    try {
      const data = await getMe();
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.warn('Failed to refresh user', err);
    }
  };

  const updateUserPassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      return await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err.message || 'Failed to change password');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        error,
        loginUser,
        verify2FaLogin,
        registerUser,
        logoutUser,
        updateUserProfile,
        updateUserPassword,
        refreshUser
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
