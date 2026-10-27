import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  registerPushSubscription,
  getPushSubscriptions,
  deletePushSubscription,
  revokeCurrentDeviceSubscription,
  sendPushTest
} from '../api/push';
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications';

const PushNotificationContext = createContext(null);

const DEVICE_ID_KEY = 'taskflow_push_device_id';
const LAST_TOKEN_KEY = 'taskflow_push_token';
const BANNER_SNOOZE_KEY = 'taskflow_push_banner_snooze_until';

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceInfo() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  let os = 'OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

  const platform = os.toLowerCase();
  const label = `${browser} on ${os}`;
  return { browser, os, platform, user_agent: ua, label };
}

function checkIsIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true;
}

export function PushNotificationProvider({ children }) {
  const { user } = useAuth();

  const isConfigured = Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY
  );

  const isSupported = Boolean(
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );

  const isIos = checkIsIos();
  const isStandalone = checkIsStandalone();
  const isIosNeedsInstall = isIos && !isStandalone;

  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const [enabled, setEnabled] = useState(false);
  const [devices, setDevices] = useState([]);
  const [showDetails, setShowDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const messagingRef = useRef(null);
  const deviceIdRef = useRef(getOrCreateDeviceId());

  // Lazy Firebase loader
  const getMessagingInstance = useCallback(async () => {
    if (messagingRef.current) return messagingRef.current;
    if (!isConfigured || !isSupported) return null;

    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, onMessage } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Suppress OS notification in foreground (toast and sound already notify)
    try {
      onMessage(messaging, () => {
        // Foreground event handled cleanly without OS notification duplicate
      });
    } catch {
      // Ignore foreground listener setup failure
    }

    messagingRef.current = messaging;
    return messaging;
  }, [isConfigured, isSupported]);

  // Refresh user's registered devices list
  const refreshDevices = useCallback(async () => {
    if (!user?.id || !isConfigured) return;
    try {
      const res = await getPushSubscriptions();
      if (res && Array.isArray(res.subscriptions)) {
        setDevices(res.subscriptions);
        const thisDevice = res.subscriptions.find((d) => d.device_id === deviceIdRef.current && d.is_active);
        setEnabled(Boolean(thisDevice));
      }
    } catch {
      // Ignored if unauthenticated or network error
    }
  }, [user?.id, isConfigured]);

  // Fetch push preference (showDetails)
  const fetchPushPreferences = useCallback(async () => {
    if (!user?.id) return;
    try {
      const prefs = await getNotificationPreferences();
      if (typeof prefs?.push_show_details === 'boolean') {
        setShowDetails(prefs.push_show_details);
      }
    } catch {
      // Fallback to default true
    }
  }, [user?.id]);

  // Update showDetails setting
  const updateShowDetails = useCallback(async (value) => {
    setShowDetails(value);
    try {
      await updateNotificationPreferences({ push_show_details: value });
    } catch (err) {
      console.warn('Failed to update push_show_details preference:', err);
    }
  }, []);

  // Internal registration helper
  const registerWithBackend = useCallback(async (token) => {
    const info = getDeviceInfo();
    await registerPushSubscription({
      token,
      device_id: deviceIdRef.current,
      platform: info.platform,
      browser: info.browser,
      os: info.os,
      user_agent: info.user_agent,
      label: info.label
    });
    localStorage.setItem(LAST_TOKEN_KEY, token);
    setEnabled(true);
    await refreshDevices();
  }, [refreshDevices]);

  // Enable push notifications (must be called from a user action/click)
  const enable = useCallback(async () => {
    if (!isConfigured) {
      throw new Error('Push notifications are not configured on this server');
    }
    if (!isSupported) {
      throw new Error('Push notifications are not supported by this browser');
    }
    if (isIosNeedsInstall) {
      throw new Error('Add TaskFlow to your Home Screen to enable desktop notifications on iOS');
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setEnabled(false);
        return false;
      }

      // Register SW
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;

      // Lazy import Firebase and get token
      const messaging = await getMessagingInstance();
      const { getToken } = await import('firebase/messaging');
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        throw new Error('Failed to retrieve registration token from Firebase');
      }

      await registerWithBackend(token);
      setBannerVisible(false);
      return true;
    } finally {
      setLoading(false);
    }
  }, [isConfigured, isSupported, isIosNeedsInstall, getMessagingInstance, registerWithBackend]);

  // Disable push notifications on current device
  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(LAST_TOKEN_KEY);
      await revokeCurrentDeviceSubscription({
        device_id: deviceIdRef.current,
        token: token || undefined
      });

      try {
        const messaging = await getMessagingInstance();
        if (messaging) {
          const { deleteToken } = await import('firebase/messaging');
          await deleteToken(messaging);
        }
      } catch {
        // FCM token deletion failure is non-fatal
      }

      localStorage.removeItem(LAST_TOKEN_KEY);
      setEnabled(false);
      await refreshDevices();
      return true;
    } finally {
      setLoading(false);
    }
  }, [getMessagingInstance, refreshDevices]);

  // Remove a specific remote device
  const removeDevice = useCallback(async (subscriptionId) => {
    await deletePushSubscription(subscriptionId);
    await refreshDevices();
  }, [refreshDevices]);

  // Send a test notification
  const sendTest = useCallback(async () => {
    return sendPushTest();
  }, []);

  // Dismiss gentle banner with 30-day snooze
  const dismissBanner = useCallback(() => {
    const snoozeUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(BANNER_SNOOZE_KEY, String(snoozeUntil));
    setBannerVisible(false);
  }, []);

  // Background token verification / refresh on app start when already granted
  useEffect(() => {
    if (!user?.id || !isConfigured || !isSupported) return;

    fetchPushPreferences();
    refreshDevices();

    // Check gentle banner visibility
    const snoozeUntil = Number(localStorage.getItem(BANNER_SNOOZE_KEY) || 0);
    const isSnoozed = Date.now() < snoozeUntil;
    if (Notification.permission === 'default' && !isSnoozed && !isIosNeedsInstall) {
      setBannerVisible(true);
    }

    // If permission already granted, silently ensure SW & token are up to date
    if (Notification.permission === 'granted') {
      (async () => {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          await navigator.serviceWorker.ready;
          const messaging = await getMessagingInstance();
          const { getToken } = await import('firebase/messaging');
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          const lastToken = localStorage.getItem(LAST_TOKEN_KEY);
          if (token && token !== lastToken) {
            await registerWithBackend(token);
          }
        } catch (err) {
          console.warn('[PUSH] Auto-refresh check skipped:', err?.message);
        }
      })();
    }
  }, [user?.id, isConfigured, isSupported, isIosNeedsInstall, fetchPushPreferences, refreshDevices, getMessagingInstance, registerWithBackend]);

  const value = {
    supported: isSupported,
    configured: isConfigured,
    permission,
    enabled,
    devices,
    showDetails,
    loading,
    deviceId: deviceIdRef.current,
    isIosNeedsInstall,
    bannerVisible,
    enable,
    disable,
    removeDevice,
    sendTest,
    refreshDevices,
    updateShowDetails,
    dismissBanner
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    return {
      supported: false,
      configured: false,
      permission: 'default',
      enabled: false,
      devices: [],
      showDetails: true,
      loading: false,
      deviceId: '',
      isIosNeedsInstall: false,
      bannerVisible: false,
      enable: async () => false,
      disable: async () => false,
      removeDevice: async () => {},
      sendTest: async () => ({ sent: 0 }),
      refreshDevices: async () => {},
      updateShowDetails: async () => {},
      dismissBanner: () => {}
    };
  }
  return context;
}
