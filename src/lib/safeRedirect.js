/**
 * Validates a redirect target path to prevent Open Redirect vulnerabilities.
 * Ensures the target is a relative path starting with a single '/' and does not
 * resolve to protocol-relative URLs (//), backslash bypasses (/\ or \), or URI schemes.
 *
 * @param {string} next - The candidate path to redirect to.
 * @param {string} fallback - The safe fallback path (default: '/').
 * @returns {string} - The safe validated path or fallback.
 */
export function validateNextRedirect(next, fallback = '/') {
  if (!next || typeof next !== 'string') {
    return fallback;
  }

  const trimmed = next.trim();

  // Must start with a single '/' and NOT with '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject backslashes anywhere in the path to prevent browser path normalization tricks
  if (trimmed.includes('\\')) {
    return fallback;
  }

  // Reject javascript:, data:, vbscript:, etc.
  if (/^\/[a-z0-9_-]+:/i.test(trimmed)) {
    return fallback;
  }

  // Check using dummy origin
  try {
    const url = new URL(trimmed, 'https://taskflow.internal');
    // Origin must match internal base exactly and pathname must match
    if (url.origin !== 'https://taskflow.internal') {
      return fallback;
    }
    // Return path + search + hash
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
