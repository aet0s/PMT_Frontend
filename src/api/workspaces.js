import { apiFetch } from './client';

export async function getWorkspaces() {
  return apiFetch('/api/workspaces');
}

export async function createWorkspace(name) {
  return apiFetch('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function updateWorkspace(id, updates) {
  return apiFetch(`/api/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteWorkspace(id) {
  return apiFetch(`/api/workspaces/${id}`, {
    method: 'DELETE'
  });
}

export async function getWorkspaceMembers(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members`);
}

export async function getWorkspaceRoles(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/roles`);
}

export async function updateWorkspaceMember(workspaceId, userId, payload) {
  const body = typeof payload === 'object' && payload !== null && 'role_id' in payload
    ? payload
    : { role_id: payload };
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function removeWorkspaceMember(workspaceId, userId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE'
  });
}

export async function getWorkspaceActivity(workspaceId, { page = 1, limit = 20, boardId = null, actionType = 'all', search = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (boardId) params.set('board_id', String(boardId));
  if (actionType && actionType !== 'all') params.set('action_type', actionType);
  if (search) params.set('search', search);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/activity${query}`);
}

export async function getWorkspaceReports(workspaceId, { boardId = null, timeframe = 'all' } = {}) {
  const params = new URLSearchParams();
  if (boardId && boardId !== 'all') params.set('board_id', String(boardId));
  if (timeframe && timeframe !== 'all') params.set('timeframe', timeframe);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/reports${query}`);
}

