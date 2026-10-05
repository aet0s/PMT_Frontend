import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, refreshAuthToken } from '../api/client';

const SocketContext = createContext(null);

// Generate unique in-memory originId per browser tab
function getTabOriginId() {
  if (typeof window === 'undefined') return '';
  if (!window.__tabOriginId) {
    window.__tabOriginId = `tab-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  }
  return window.__tabOriginId;
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const originIdRef = useRef(getTabOriginId());

  // Audio chime player
  const playNotificationSound = () => {
    try {
      const soundPref = localStorage.getItem('soundEffectsEnabled');
      if (soundPref !== 'false') {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext not allowed or not supported
    }
  };

  // Fetch initial notifications (top 10 for quick bell access)
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/api/notifications?page=1&limit=10');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    const serverUrl = import.meta.env.VITE_SERVER_URL || `${protocol}//${host}:5000`;

    const socketInstance = io(serverUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id, 'to', serverUrl);
      setConnected(true);
    });

    socketInstance.on('connect_error', async (err) => {
      console.warn('Socket connection error:', err?.message);
      if (err?.message === 'unauthorized' || err?.message === 'SESSION_REVOKED') {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          socketInstance.connect();
        }
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
    });

    setSocket(socketInstance);
    fetchNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id]);

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAsUnread = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/unread`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to mark notification unread:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const deleteNotificationItem = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAllRead = async () => {
    try {
      await apiFetch('/api/notifications/clear/read', { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        originId: originIdRef.current,
        notifications,
        unreadCount,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotificationItem,
        clearAllRead,
        refetchNotifications: fetchNotifications
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
