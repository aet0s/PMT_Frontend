import { getApiUrl, getFileUrl, API_BASE_URL, SOCKET_URL } from './config.js';
import { updateServerTime } from '../lib/dateFormat.js';
import { generateMutationId } from '../lib/mutationTracker.js';
import { encryptRequestPayload } from './crypto.js';
import { mapUrlToOperation } from './operationMapper.js';

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
 * Single appropriately scoped CSRF token management:
 * In-memory token cache for synchronous API calls + sessionStorage for tab reload resilience.
 * Unnecessary duplicate localStorage persistence has been eliminated.
 */
let inMemoryCsrfToken = null;

// Purge any legacy duplicate CSRF tokens from localStorage
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('taskflow_csrf_token');
  }
} catch (e) { }

export function setCsrfToken(token) {
  if (token && typeof token === 'string') {
    inMemoryCsrfToken = token;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('taskflow_csrf_token', token);
      }
    } catch (e) { }
  }
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('taskflow_csrf_token');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('taskflow_csrf_token');
    }
  } catch (e) { }
}

function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken() {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem('taskflow_csrf_token');
      if (saved) {
        inMemoryCsrfToken = saved;
        return saved;
      }
    }
  } catch (e) { }
  const fromCookie = getCsrfTokenFromCookie();
  if (fromCookie) {
    inMemoryCsrfToken = fromCookie;
    return fromCookie;
  }
  return null;
}

let inFlightCsrfPromise = null;

// Strict Cookie-Only Architecture: JWTs are NEVER stored in localStorage or sessionStorage.
// Authentication is handled exclusively through HttpOnly session and refresh cookies.
try {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('taskflow_auth_token');
  if (typeof localStorage !== 'undefined') localStorage.removeItem('taskflow_auth_token');
} catch (e) { }

export function setAuthToken() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('taskflow_auth_token');
    if (typeof localStorage !== 'undefined') localStorage.removeItem('taskflow_auth_token');
  } catch (e) { }
}

export function getAuthToken() {
  return null;
}

export async function ensureCsrfToken() {
  const current = getCsrfToken();
  if (current) return current;
  if (inFlightCsrfPromise) return inFlightCsrfPromise;

  inFlightCsrfPromise = (async () => {
    try {
      const res = await fetch(getApiUrl('/api/time'), {
        method: 'GET',
        credentials: 'include'
      });
      const headerToken = res.headers.get('x-csrf-token');
      if (headerToken) {
        setCsrfToken(headerToken);
        return headerToken;
      }
      const data = await res.json().catch(() => null);
      const jsonToken = data?.csrfToken || data?.csrf_token;
      if (jsonToken) {
        setCsrfToken(jsonToken);
        return jsonToken;
      }
    } catch (e) { }
    return getCsrfToken();
  })().finally(() => {
    inFlightCsrfPromise = null;
  });

  return inFlightCsrfPromise;
}

/**
 * Checks if a requested URL is a deliberate infrastructure or binary exception
 * that must not be routed through /api/secure.
 * Under the strict POST-only encrypted architecture, all business operations (including
 * auth, reads, mutations, and file metadata) are routed via POST /api/secure.
 */
function isDeliberateException(url, options) {
  if (!url || typeof url !== 'string') return false;
  // Multipart binary file uploads
  if (options.body instanceof FormData || url.includes('/api/upload')) return true;
  // Infrastructure server time sync
  if (url.includes('/api/time')) return true;
  // Public encryption key fetch
  if (url.includes('/keys/server-public.pem')) return true;
  // System health check
  if (url.includes('/api/health')) return true;
  // Direct secure endpoint
  if (url === '/api/secure' || url.endsWith('/api/secure')) return true;

  return false;
}

/**
 * Execute single-flight token refresh across tabs and within tab
 * Pure HttpOnly cookie rotation - encrypted POST /api/secure operation.
 */
export async function refreshAuthToken() {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
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
      let response;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const envelope = await encryptRequestPayload({
            operation: 'auth.refresh',
            data: {},
            request_id: generateId()
          });

          const defaultHeaders = {};
          if (!getCsrfToken()) {
            await ensureCsrfToken();
          }
          const csrfToken = getCsrfToken();
          if (csrfToken) {
            defaultHeaders['X-CSRF-Token'] = csrfToken;
          }

          response = await fetch(getApiUrl('/api/secure'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...defaultHeaders
            },
            credentials: 'include',
            body: JSON.stringify(envelope)
          });

          if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break;
        } catch (netErr) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw netErr;
        }
      }

      const success = response && response.ok;
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
      done(false);
    }, Math.max(500, maxWaitMs));
  });
}

/**
 * Centralized API Fetch client.
 * All normal business operations are automatically encrypted into the POST /api/secure envelope.
 * Dedicated exceptions (files, uploads, health, time) pass through with credentials.
 */
export async function apiFetch(url, options = {}, isRetry = false) {
  const method = (options.method || 'GET').toUpperCase();
  const defaultHeaders = {};

  if (typeof window !== 'undefined' && window.__tabOriginId) {
    defaultHeaders['x-origin-id'] = window.__tabOriginId;
  }

  const authToken = getAuthToken();
  if (authToken && !defaultHeaders['Authorization'] && !options.headers?.['Authorization'] && !options.headers?.['authorization']) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  if (!getCsrfToken()) {
    await ensureCsrfToken();
  }
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    defaultHeaders['X-CSRF-Token'] = csrfToken;
  }

  // 1. Deliberate exceptions (e.g. multipart upload, binary download, server time sync)
  if (isDeliberateException(url, options)) {
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    if (method !== 'GET') {
      defaultHeaders['x-client-mutation-id'] = options.clientMutationId || generateMutationId();
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      credentials: 'include'
    };

    const response = await fetch(getApiUrl(url), config);
    return handleApiResponse(response, url, options, isRetry);
  }

  // 2. All business operations routed through encrypted POST /api/secure
  let parsedBody = {};
  if (options.data && typeof options.data === 'object') {
    parsedBody = { ...options.data };
  } else if (options.body) {
    if (typeof options.body === 'string') {
      try {
        parsedBody = JSON.parse(options.body);
      } catch {
        parsedBody = { raw: options.body };
      }
    } else if (typeof options.body === 'object') {
      parsedBody = options.body;
    }
  }

  // Map legacy URL/method or resolve explicit operation
  const mapped = mapUrlToOperation(url, method, parsedBody);
  const operation = options.operation || mapped.operation;
  const data = options.data || mapped.data;

  // Strict payload envelope: only operation, data, request_id, idempotency_key
  const innerPayload = {
    operation,
    data,
    request_id: generateId(),
    idempotency_key: options.idempotencyKey || (method !== 'GET' ? generateMutationId() : null)
  };

  // Encrypt payload into standard envelope (RSA-OAEP SHA-256 + AES-256-GCM)
  const envelope = await encryptRequestPayload(innerPayload);

  const secureConfig = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include',
    body: JSON.stringify(envelope)
  };

  const response = await fetch(getApiUrl('/api/secure'), secureConfig);
  return handleApiResponse(response, url, { ...options, operation }, isRetry);
}

/**
 * Shared response handler for status codes, token refresh, and time synchronization.
 */
async function handleApiResponse(response, url, options, isRetry) {
  const serverHeaderTime = response.headers.get('x-server-time') || response.headers.get('date');
  if (serverHeaderTime) {
    updateServerTime(serverHeaderTime);
  }

  const serverCsrf = response.headers.get('x-csrf-token');
  if (serverCsrf) {
    setCsrfToken(serverCsrf);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (data?.server_time || data?.server_time_ms) {
    updateServerTime(data.server_time_ms || data.server_time);
  }

  if (data?.csrfToken || data?.csrf_token) {
    setCsrfToken(data.csrfToken || data.csrf_token);
  }

  // Cookie-only: session tokens are held strictly in HttpOnly cookies, not JavaScript storage
  if (options?.operation === 'auth.logout' || url.includes('/api/auth/logout')) {
    setAuthToken();
    clearCsrfToken();
  }

  if (!response.ok) {
    const isAuthRoute = url.includes('/api/auth/login') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/logout') ||
      url.includes('/api/auth/me') ||
      url.includes('/api/invitations/verify') ||
      url === 'auth.login' ||
      url === 'auth.refresh' ||
      url === 'auth.register' ||
      url === 'auth.logout' ||
      url === 'auth.me' ||
      options?.operation === 'auth.login' ||
      options?.operation === 'auth.refresh' ||
      options?.operation === 'auth.register' ||
      options?.operation === 'auth.logout' ||
      options?.operation === 'auth.me';

    if (response.status === 401 && !isAuthRoute && !isRetry) {
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        return apiFetch(url, options, true); // Retry once with refreshed cookie
      }
      if (typeof window !== 'undefined') {
        const publicPaths = ['/login', '/register', '/invite', '/forgot-password', '/reset-password'];
        const isPublicPage = publicPaths.some((p) => window.location.pathname.startsWith(p));
        if (!isPublicPage && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    if (response.status === 403 && data?.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
    }

    if (response.status === 403 && data?.error?.code === 'TWO_FA_SETUP_REQUIRED') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/account/security') {
        window.location.href = '/account/security';
      }
    }

    if (response.status === 403 && data?.error?.code === 'PERMISSION_DENIED') {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(data.error.message || "You don't have permission to do that", 'error');
      }
    }

    const requestId = data?.error?.requestId || response.headers.get('x-request-id');
    const error = data?.error || {
      message: `Request failed with status ${response.status}`,
      code: 'HTTP_ERROR'
    };
    error.status = response.status;
    if (requestId) {
      error.requestId = requestId;
    }
    throw error;
  }

  return data;
}

/**
 * Explicit helper to invoke a registered operation by name.
 */
export async function securePost(operation, data = {}, options = {}) {
  return apiFetch('/api/secure', {
    ...options,
    operation,
    data,
    method: 'POST'
  });
}

/**
 * Fetch a protected file as a Blob over the encrypted gateway.
 */
export async function fetchProtectedFileBlob(params) {
  const payloadData = typeof params === 'object' ? params : (typeof params === 'number' ? { file_id: params } : { file_path: params });
  const result = await securePost('files.download', payloadData);
  if (!result || !result.data_base64) {
    throw new Error('Failed to retrieve file contents');
  }
  const byteCharacters = atob(result.data_base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: result.file_type || 'application/octet-stream' });
}

/**
 * Download a protected file over the encrypted gateway.
 */
export async function downloadProtectedFile(params) {
  const blob = await fetchProtectedFileBlob(params);
  if (typeof window !== 'undefined') {
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = params.file_name || params.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  }
  return true;
}

export { getApiUrl, getFileUrl, API_BASE_URL, SOCKET_URL };
