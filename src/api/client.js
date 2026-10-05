import { getApiUrl, getFileUrl, API_BASE_URL, SOCKET_URL } from './config';

// Single-flight refresh coordination within tab and across tabs
let inFlightRefreshPromise = null;
const REFRESH_CHANNEL_NAME = 'pm_auth_refresh_channel';
const LOCK_KEY = 'pm_auth_refresh_lock';
const LOCK_TIMEOUT_MS = 6000;

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const currentTabId = typeof window !== 'undefined' ? (window.__tabId || (window.__tabId = generateId())) : 'tab_node';

/**
 * Execute single-flight token refresh across tabs and within tab
 */
export async function refreshAuthToken() {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    if (typeof window === 'undefined') {
      // In non-browser environments, direct fetch
      const res = await fetch(getApiUrl('/api/auth/refresh'), { method: 'POST', credentials: 'include' });
      return res.ok;
    }

    // Check if another tab holds the lock
    const lockRaw = localStorage.getItem(LOCK_KEY);
    const now = Date.now();
    if (lockRaw) {
      try {
        const lock = JSON.parse(lockRaw);
        if (now - lock.timestamp < LOCK_TIMEOUT_MS && lock.tabId !== currentTabId) {
          // Another tab is refreshing. Wait for BroadcastChannel or timeout
          const refreshed = await waitForOtherTabRefresh(LOCK_TIMEOUT_MS - (now - lock.timestamp));
          if (refreshed) return true;
        }
      } catch (e) {
        localStorage.removeItem(LOCK_KEY);
      }
    }

    // Acquire lock for this tab
    localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: currentTabId, timestamp: Date.now() }));
    
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(REFRESH_CHANNEL_NAME);
      } catch (e) {
        bc = null;
      }
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const success = response.ok;
      localStorage.removeItem(LOCK_KEY);

      if (bc) {
        bc.postMessage({ type: success ? 'REFRESH_SUCCESS' : 'REFRESH_FAILED', tabId: currentTabId });
      }

      return success;
    } catch (err) {
      localStorage.removeItem(LOCK_KEY);
      if (bc) {
        bc.postMessage({ type: 'REFRESH_FAILED', tabId: currentTabId });
      }
      return false;
    } finally {
      if (bc) bc.close();
    }
  })().finally(() => {
    inFlightRefreshPromise = null;
  });

  return inFlightRefreshPromise;
}

function waitForOtherTabRefresh(maxWaitMs) {
  return new Promise((resolve) => {
    let resolved = false;
    let bc = null;

    const cleanup = () => {
      if (bc) {
        bc.removeEventListener('message', handleMessage);
        bc.close();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
    };

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    const handleMessage = (event) => {
      if (event.data?.type === 'REFRESH_SUCCESS') done(true);
      if (event.data?.type === 'REFRESH_FAILED') done(false);
    };

    const handleStorage = (e) => {
      if (e.key === LOCK_KEY && !e.newValue) {
        // Lock released by other tab
        done(true);
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(REFRESH_CHANNEL_NAME);
        bc.addEventListener('message', handleMessage);
      } catch (e) {
        bc = null;
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    setTimeout(() => {
      done(false); // timeout, fall back to trying refresh or failing
    }, Math.max(500, maxWaitMs));
  });
}

import { generateMutationId } from '../lib/mutationTracker';

// Fetch wrapper with credentials for cookie session auth
export async function apiFetch(url, options = {}, isRetry = false) {
  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (typeof window !== 'undefined' && window.__tabOriginId) {
    defaultHeaders['x-origin-id'] = window.__tabOriginId;
  }

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    const mutationId = options.clientMutationId || generateMutationId();
    defaultHeaders['x-client-mutation-id'] = mutationId;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include' // Send httpOnly JWT cookie
  };

  const fullUrl = getApiUrl(url);
  const response = await fetch(fullUrl, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    // If 401 Unauthorized occurs on a protected route and we haven't retried yet,
    // attempt single-flight token refresh
    const isAuthRoute = url.includes('/api/auth/login') ||
                        url.includes('/api/auth/refresh') ||
                        url.includes('/api/auth/register') ||
                        url.includes('/api/auth/logout');

    if (response.status === 401 && !isAuthRoute && !isRetry) {
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        return apiFetch(url, options, true); // Retry once with refreshed cookie
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (response.status === 403 && data?.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
    }

    if (response.status === 403 && data?.error?.code === 'PERMISSION_DENIED') {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(data.error.message || "You don't have permission to do that", 'error');
      }
    }

    const error = data?.error || {
      message: `Request failed with status ${response.status}`,
      code: 'HTTP_ERROR'
    };
    throw error;
  }

  return data;
}

export { getApiUrl, getFileUrl, API_BASE_URL, SOCKET_URL };
