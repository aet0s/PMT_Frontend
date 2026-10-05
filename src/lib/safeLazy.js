// client/src/lib/safeLazy.js
// Wraps React.lazy with automatic chunk-load retry and sessionStorage guard
import { lazy } from 'react';

export function safeLazy(factory, componentName = '') {
  return lazy(() =>
    factory().catch((err) => {
      const isChunkError =
        err?.name === 'ChunkLoadError' ||
        /loading chunk/i.test(err?.message || '') ||
        /failed to fetch dynamically imported module/i.test(err?.message || '') ||
        /error loading dynamically imported module/i.test(err?.message || '');

      if (isChunkError && typeof window !== 'undefined' && window.sessionStorage) {
        const retryKey = `chunk_retry_${componentName || factory.toString().slice(0, 32)}`;
        const hasRetried = window.sessionStorage.getItem(retryKey);

        if (!hasRetried) {
          window.sessionStorage.setItem(retryKey, '1');
          console.warn(`[safeLazy] Chunk load failed for ${componentName || 'component'}. Reloading page to fetch latest bundle...`);
          window.location.reload();
          // Return a pending promise while reload executes
          return new Promise(() => {});
        } else {
          // Already attempted retry once in this session for this chunk; clear to avoid permanent lock
          window.sessionStorage.removeItem(retryKey);
        }
      }

      throw err;
    })
  );
}
