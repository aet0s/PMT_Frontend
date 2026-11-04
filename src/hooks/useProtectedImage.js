// client/src/hooks/useProtectedImage.js
// Hook to fetch and render protected images via the encrypted files.download gateway as Blob URLs.

import { useState, useEffect } from 'react';
import { fetchProtectedFileBlob } from '../api/client';

// In-memory cache of resolved Blob URLs by file path/url
const blobUrlCache = new Map();
const pendingRequests = new Map();

function isDirectUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return true;
  if (/^https?:\/\//i.test(url)) {
    // Only route internal /api/files/ and /uploads/ paths through the encrypted gateway
    const isInternalFile = url.includes('/api/files/') || url.includes('/uploads/');
    return !isInternalFile;
  }
  return false;
}

/**
 * Loads a protected image URL via the encrypted gateway and returns a local object URL.
 * @param {string|null} filePath - Stored image URL or relative path (e.g. /api/files/1/workspaces/ws_1_... or blob:/data:)
 * @returns {string|null} - In-memory Blob URL or null if loading/empty
 */
export function useProtectedImage(filePath) {
  const [blobUrl, setBlobUrl] = useState(() => {
    if (!filePath) return null;
    if (typeof filePath === 'string' && isDirectUrl(filePath)) {
      return filePath;
    }
    return blobUrlCache.get(filePath) || null;
  });

  useEffect(() => {
    let isMounted = true;

    if (!filePath || typeof filePath !== 'string') {
      setBlobUrl(null);
      return;
    }

    // Direct data, blob, or external third-party URLs do not require fetching
    if (isDirectUrl(filePath)) {
      setBlobUrl(filePath);
      return;
    }

    // Check memory cache
    if (blobUrlCache.has(filePath)) {
      setBlobUrl(blobUrlCache.get(filePath));
      return;
    }

    // Reuse in-flight promise if multiple components request the same image concurrently
    let fetchPromise = pendingRequests.get(filePath);
    if (!fetchPromise) {
      fetchPromise = fetchProtectedFileBlob({ file_path: filePath })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          blobUrlCache.set(filePath, objectUrl);
          pendingRequests.delete(filePath);
          return objectUrl;
        })
        .catch((err) => {
          pendingRequests.delete(filePath);
          blobUrlCache.set(filePath, null);
          console.warn('[ProtectedImage] Failed to load image via files.download:', filePath, err.message);
          return null;
        });
      pendingRequests.set(filePath, fetchPromise);
    }

    fetchPromise.then((loadedUrl) => {
      if (isMounted && loadedUrl) {
        setBlobUrl(loadedUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  return blobUrl;
}

/**
 * Evict a URL from cache (e.g. when an image is replaced or removed).
 */
export function invalidateProtectedImageCache(filePath) {
  if (filePath && blobUrlCache.has(filePath)) {
    const existingUrl = blobUrlCache.get(filePath);
    if (existingUrl && existingUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch {}
    }
    blobUrlCache.delete(filePath);
  }
}

