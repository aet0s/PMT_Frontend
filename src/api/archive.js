import { apiFetch } from './client';

export async function getArchive(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      query.set(k, String(v));
    }
  });
  const qs = query.toString();
  return apiFetch(qs ? `/api/archive?${qs}` : '/api/archive');
}
