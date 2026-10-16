import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, refreshAuthToken } from '../api/client';
import { SOCKET_URL } from '../api/config';
import {
  getNotificationSummary,
  getNotificationPreferences,
  markBoardNotificationsAsRead,
  muteTarget,
  unmuteTarget
} from '../api/notifications';
import { playNotificationBellSound } from '../lib/notificationSound';
import { useToast } from '../components/ui/Toast';
import { useNotificationSound } from './NotificationSoundContext';

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
  const { enabled: soundEnabled } = useNotificationSound();
  let toastContext = null;
  try {
    toastContext = useToast();
  } catch {
    // Graceful fallback if rendered outside ToastProvider
  }

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [byBoardUnread, setByBoardUnread] = useState({});
  const [byCategoryUnread, setByCategoryUnread] = useState({});
  const [mutes, setMutes] = useState({ boards: [], cards: [] });
  const originIdRef = useRef(getTabOriginId());
  const audioUnlockedRef = useRef(false);

  // Audio gesture unlock listener
  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Audio bell player (respects mutes, reduced-motion, and user setting)
  const playNotificationSound = useCallback((notification) => {
    try {
      if (!soundEnabled) return;

      // Never play for muted boards
      if (notification?.board_id && mutes.boards?.some((id) => Number(id) === Number(notification.board_id))) {
        return;
      }

      // Never play for muted cards
      if (notification?.card_id && mutes.cards?.some((id) => Number(id) === Number(notification.card_id))) {
        return;
      }

      playNotificationBellSound();
    } catch {
      // Audio playback failed or blocked
    }
  }, [mutes, soundEnabled]);

  // Fetch summary (total unread, by_board unread map, by_category map, mutes, preferences)
  const fetchSummary = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotificationSummary();
      if (typeof data.unread_total === 'number') {
        setUnreadCount(data.unread_total);
      }
      if (data.by_board && typeof data.by_board === 'object') {
        setByBoardUnread(data.by_board);
      }
      if (data.by_category && typeof data.by_category === 'object') {
        setByCategoryUnread(data.by_category);
      }
      if (data.mutes) {
        setMutes(data.mutes);
      }
    } catch (err) {
      console.warn('Failed to load notification summary:', err);
    }
  }, [user]);

  // Fetch top 10 notifications for quick bell access
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/api/notifications?page=1&limit=10');
      setNotifications(data.notifications || []);
      if (typeof data.unread_total === 'number') {
        setUnreadCount(data.unread_total);
      } else if (typeof data.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      setNotifications([]);
      setUnreadCount(0);
      setByBoardUnread({});
      return;
    }

    const serverUrl = SOCKET_URL;

    const token = typeof window !== 'undefined'
      ? (sessionStorage.getItem('pm_token') || localStorage.getItem('pm_token'))
      : null;

    const socketInstance = io(serverUrl, {
      auth: { token },
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
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
      setConnected(false);
    });

    socketInstance.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Update unread totals
      if (typeof notification.unread_total === 'number') {
        setUnreadCount(notification.unread_total);
      } else {
        setUnreadCount((prev) => prev + 1);
      }

      // Update per-board unread count
      if (notification.board_id) {
        const bId = String(notification.board_id);
        setByBoardUnread((prev) => ({
          ...prev,
          [bId]: typeof notification.unread_board === 'number'
            ? notification.unread_board
            : ((prev[bId] || 0) + 1)
        }));
      }

      // Only personal events produce toast and sound (other main events appear in bell silently)
      const PERSONAL_EVENTS = new Set([
        'card.assigned',
        'card.unassigned',
        'comment.mention',
        'comment.added',
        'card.due_soon',
        'card.overdue'
      ]);

      const evType = notification.event_type || notification.type;
      const isPersonal = PERSONAL_EVENTS.has(evType);

      if (isPersonal) {
        playNotificationSound(notification);

        try {
          toastContext?.show?.({
            type: notification.priority === 'urgent' ? 'error' : 'info',
            title: notification.title || 'Notification',
            message: notification.message
          });
        } catch {
          // Toast failure ignored
        }
      }
    });

    setSocket(socketInstance);
    fetchNotifications();
    fetchSummary();

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id, fetchNotifications, fetchSummary]);

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      let boardIdToDecrement = null;
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id) {
            if (!n.is_read && n.board_id) boardIdToDecrement = String(n.board_id);
            return { ...n, is_read: true };
          }
          return n;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (boardIdToDecrement) {
        setByBoardUnread((prev) => ({
          ...prev,
          [boardIdToDecrement]: Math.max(0, (prev[boardIdToDecrement] || 1) - 1)
        }));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAsUnread = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/unread`, { method: 'PATCH' });
      let boardIdToIncrement = null;
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id) {
            if (n.is_read && n.board_id) boardIdToIncrement = String(n.board_id);
            return { ...n, is_read: false };
          }
          return n;
        })
      );
      setUnreadCount((prev) => prev + 1);
      if (boardIdToIncrement) {
        setByBoardUnread((prev) => ({
          ...prev,
          [boardIdToIncrement]: (prev[boardIdToIncrement] || 0) + 1
        }));
      }
    } catch (err) {
      console.error('Failed to mark notification unread:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setByBoardUnread({});
      setByCategoryUnread({});
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const markBoardAsRead = async (boardId) => {
    if (!boardId) return;
    try {
      await markBoardNotificationsAsRead(boardId);
      const bKey = String(boardId);
      const prevBoardCount = byBoardUnread[bKey] || 0;
      setNotifications((prev) =>
        prev.map((n) => (String(n.board_id) === bKey ? { ...n, is_read: true } : n))
      );
      setByBoardUnread((prev) => ({ ...prev, [bKey]: 0 }));
      setUnreadCount((prev) => Math.max(0, prev - prevBoardCount));
    } catch (err) {
      console.error('Failed to mark board read:', err);
    }
  };

  const deleteNotificationItem = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const target = notifications.find((n) => n.id === id);
      const wasUnread = target && !target.is_read;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (target.board_id) {
          const bKey = String(target.board_id);
          setByBoardUnread((prev) => ({
            ...prev,
            [bKey]: Math.max(0, (prev[bKey] || 1) - 1)
          }));
        }
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

  const muteBoard = async (boardId, muteUntil = null) => {
    try {
      await muteTarget('board', boardId, muteUntil);
      setMutes((prev) => ({
        ...prev,
        boards: Array.from(new Set([...prev.boards, Number(boardId)]))
      }));
    } catch (err) {
      console.error('Failed to mute board:', err);
      throw err;
    }
  };

  const unmuteBoard = async (boardId) => {
    try {
      await unmuteTarget('board', boardId);
      setMutes((prev) => ({
        ...prev,
        boards: prev.boards.filter((id) => id !== Number(boardId))
      }));
    } catch (err) {
      console.error('Failed to unmute board:', err);
      throw err;
    }
  };

  const muteCard = async (cardId, muteUntil = null) => {
    try {
      await muteTarget('card', cardId, muteUntil);
      setMutes((prev) => ({
        ...prev,
        cards: Array.from(new Set([...prev.cards, Number(cardId)]))
      }));
    } catch (err) {
      console.error('Failed to mute card:', err);
      throw err;
    }
  };

  const unmuteCard = async (cardId) => {
    try {
      await unmuteTarget('card', cardId);
      setMutes((prev) => ({
        ...prev,
        cards: prev.cards.filter((id) => id !== Number(cardId))
      }));
    } catch (err) {
      console.error('Failed to unmute card:', err);
      throw err;
    }
  };

  const isBoardMuted = (boardId) => {
    return (mutes.boards || []).includes(Number(boardId));
  };

  const isCardMuted = (cardId) => {
    return (mutes.cards || []).includes(Number(cardId));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        originId: originIdRef.current,
        notifications,
        unreadCount,
        byBoardUnread,
        byCategoryUnread,
        mutes,
        isBoardMuted,
        isCardMuted,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        markBoardAsRead,
        deleteNotificationItem,
        clearAllRead,
        muteBoard,
        unmuteBoard,
        muteCard,
        unmuteCard,
        refetchNotifications: fetchNotifications,
        refetchSummary: fetchSummary
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
