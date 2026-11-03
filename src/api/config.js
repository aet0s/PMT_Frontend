// client/src/api/config.js
/**
 * Central API & Backend URL configuration module.
 *
 * Reads environment variables configured in client/.env:
 * - VITE_API_URL: Central backend API URL (e.g. http://127.0.0.1:5000 in dev, or https://pmtmgmt.solarman.in in production)
 * - VITE_SERVER_URL: Central Socket.io / WebSocket server URL
 * - VITE_API_TARGET: Fallback proxy target
 */

const isProd = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');

export function resolveBackendUrl(envValue) {
  // In production: Strictly locked to canonical production API hostname.
  // NEVER derived from arbitrary browser host input.
  if (isProd) {
    return 'https://pmtmgmt.solarman.in';
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'solarman.in' || window.location.hostname.endsWith('.solarman.in')) {
      return 'https://pmtmgmt.solarman.in';
    }
    // In development on loopback, strictly align with the active browser host (localhost or 127.0.0.1)
    // so cookies and CSRF tokens remain strictly same-site without cross-site drops.
    const currentHost = window.location.hostname;
    if (currentHost === 'localhost') {
      return 'http://localhost:5000';
    }
    if (currentHost === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }
  }
  return envValue || 'http://127.0.0.1:5000';
}

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});

export const API_BASE_URL = resolveBackendUrl(
  metaEnv.VITE_API_URL ||
  metaEnv.VITE_SERVER_URL ||
  metaEnv.VITE_API_TARGET
);

export const SOCKET_URL = resolveBackendUrl(
  metaEnv.VITE_SERVER_URL ||
  metaEnv.VITE_API_URL ||
  metaEnv.VITE_API_TARGET
);

/**
 * Returns the fully-qualified API URL for a given relative or absolute endpoint.
 * E.g. getApiUrl('/api/auth/me') -> 'http://127.0.0.1:5000/api/auth/me' (or relative if base is empty)
 *
 * @param {string} endpoint - Relative path (e.g. '/api/boards') or absolute URL
 * @returns {string} Fully resolved URL
 */
export function getApiUrl(endpoint = '') {
  const currentBase = resolveBackendUrl(API_BASE_URL);
  if (!endpoint) return currentBase;
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const base = currentBase ? currentBase.replace(/\/+$/, '') : '';
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${path}` : path;
}

/**
 * Constructs the absolute URL for file uploads, avatars, and media attachments.
 * If the file URL is already absolute or data/blob, it is returned as is.
 *
 * @param {string} fileUrl - Relative path (e.g. '/uploads/avatar.png') or absolute URL
 * @returns {string} Fully resolved file URL
 */
export function getFileUrl(fileUrl = '') {
  if (!fileUrl) return '';
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) {
    return fileUrl;
  }
  let path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  if (!path.startsWith('/api/files/') && !path.startsWith('/uploads/')) {
    if (path.includes('/avatars/')) {
      path = `/api/files${path}`;
    }
  }
  const base = resolveBackendUrl(API_BASE_URL).replace(/\/+$/, '');
  return base ? `${base}${path}` : path;
}
