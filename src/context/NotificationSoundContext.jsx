// client/src/context/NotificationSoundContext.jsx
// Single source of truth for notification sound settings across all components and tabs.
// Optimistic UI, instantaneous server synchronization, cross-tab sync, and audio preview.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications';
import { playNotificationBellSound } from '../lib/notificationSound';
import { useAuth } from '../hooks/useAuth';

const STORAGE_KEY = 'soundEffectsEnabled';

export const NotificationSoundContext = createContext({
  enabled: true,
  setEnabled: () => {},
  playPreview: () => {},
  isLoading: false
});

export function NotificationSoundProvider({ children }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  });
  const [isLoading, setIsLoading] = useState(false);
  const bcRef = useRef(null);

  // Cross-tab synchronization via BroadcastChannel and StorageEvent
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('pm_notification_sound');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SOUND_TOGGLE' && typeof event.data.enabled === 'boolean') {
            setEnabledState(event.data.enabled);
          }
        };
        bcRef.current = bc;
      } catch {
        // Fallback to storage event
      }
    }

    const handleStorageEvent = (event) => {
      if (event.key === STORAGE_KEY) {
        setEnabledState(event.newValue !== 'false');
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, []);

  // Fetch initial preferences from server when user logs in (server value wins; default ON)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function syncFromServer() {
      try {
        const prefs = await getNotificationPreferences();
        if (!isMounted || !prefs) return;

        const serverSound = prefs.play_sound !== undefined ? prefs.play_sound : prefs.sound_effects;
        const finalVal = serverSound !== undefined && serverSound !== null ? Boolean(serverSound) : true;

        setEnabledState(finalVal);
        localStorage.setItem(STORAGE_KEY, String(finalVal));
      } catch (err) {
        // Keep current or default ON
      }
    }

    syncFromServer();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const setEnabled = useCallback(
    async (nextValue) => {
      const targetValue = Boolean(nextValue);
      const previousValue = enabled;

      // 1. Optimistic local update
      setEnabledState(targetValue);
      localStorage.setItem(STORAGE_KEY, String(targetValue));

      // 2. Cross-tab broadcast
      if (bcRef.current) {
        try {
          bcRef.current.postMessage({ type: 'SOUND_TOGGLE', enabled: targetValue });
        } catch {}
      }

      // 3. Audio feedback: Short preview chime when switched ON (user gesture unlocks audio)
      if (targetValue) {
        playNotificationBellSound();
      }

      // 4. Persist immediately to server
      setIsLoading(true);
      try {
        await updateNotificationPreferences({
          play_sound: targetValue,
          sound_effects: targetValue
        });
      } catch (err) {
        // Revert on failure
        setEnabledState(previousValue);
        localStorage.setItem(STORAGE_KEY, String(previousValue));
        if (bcRef.current) {
          try {
            bcRef.current.postMessage({ type: 'SOUND_TOGGLE', enabled: previousValue });
          } catch {}
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  const playPreview = useCallback(() => {
    playNotificationBellSound();
  }, []);

  return (
    <NotificationSoundContext.Provider value={{ enabled, setEnabled, playPreview, isLoading }}>
      {children}
    </NotificationSoundContext.Provider>
  );
}

export function useNotificationSound() {
  return useContext(NotificationSoundContext);
}
