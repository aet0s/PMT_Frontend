import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login, register, logout, updateProfile, changePassword } from '../api/auth';

import { clearTenantStorage } from '../lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();

    const handleLogoutSync = () => {
      setUser(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
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

  const loginUser = async (email, password) => {
    setError(null);
    try {
      const data = await login(email, password);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const registerUser = async (name, email, password, inviteToken) => {
    setError(null);
    try {
      const data = await register(name, email, password, inviteToken);
      if (data.initial_workspace_id) {
        localStorage.setItem('activeWorkspaceId', data.initial_workspace_id);
      }
      if (data.initial_board_id) {
        localStorage.setItem('activeBoardId', data.initial_board_id);
      }
      setUser(data.user);
      return data.user;
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
