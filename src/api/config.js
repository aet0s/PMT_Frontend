// client/src/api/config.js
/**
 * Central API & Backend URL configuration module.
 *
 * Reads environment variables configured in client/.env:
 * - VITE_API_URL: Central backend API URL (e.g. http://localhost:5000 or https://api.production.com)
 * - VITE_SERVER_URL: Central Socket.io / WebSocket server URL
 * - VITE_API_TARGET: Fallback proxy target
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API_TARGET ||
  '';

export const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_TARGET ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.hostname}:5000`
    : 'http://localhost:5000');

/**
 * Returns the fully-qualified API URL for a given relative or absolute endpoint.
 * E.g. getApiUrl('/api/auth/me') -> 'http://localhost:5000/api/auth/me' (or relative if base is empty)
 *
 * @param {string} endpoint - Relative path (e.g. '/api/boards') or absolute URL
 * @returns {string} Fully resolved URL
 */
export function getApiUrl(endpoint = '') {
  if (!endpoint) return API_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/+$/, '') : '';
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
  const base = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_API_TARGET ||
    ''
  ).replace(/\/+$/, '');
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return base ? `${base}${path}` : path;
}
