import { apiFetch } from './client';

export async function getArchive() {
  return apiFetch('/api/archive');
}
