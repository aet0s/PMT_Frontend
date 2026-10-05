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
