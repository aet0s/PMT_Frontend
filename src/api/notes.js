// client/src/api/notes.js
import { apiFetch } from './client';

export async function getNotes({ trash = false, q = '', workspaceId = null } = {}) {
  const params = new URLSearchParams();
  if (trash) params.set('trash', '1');
  if (q && q.trim()) params.set('q', q.trim());
  if (workspaceId) params.set('workspace_id', String(workspaceId));
  const qs = params.toString();
  return apiFetch(`/api/notes${qs ? `?${qs}` : ''}`);
}

export async function createNote(payload = {}) {
  return apiFetch('/api/notes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateNote(id, payload = {}) {
  return apiFetch(`/api/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function duplicateNote(id, payload = {}) {
  return apiFetch(`/api/notes/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteNote(id, payload = {}) {
  return apiFetch(`/api/notes/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(payload)
  });
}

export async function restoreNote(id, payload = {}) {
  return apiFetch(`/api/notes/${id}/restore`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function purgeNote(id, payload = {}) {
  return apiFetch(`/api/notes/${id}/purge`, {
    method: 'DELETE',
    body: JSON.stringify(payload)
  });
}

export async function batchUpdateNotePositions(positions = [], workspaceId = null) {
  return apiFetch('/api/notes/batch-positions', {
    method: 'POST',
    body: JSON.stringify({ positions, ...(workspaceId ? { workspace_id: workspaceId } : {}) })
  });
}
