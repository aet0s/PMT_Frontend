import { apiFetch } from './client';

export async function getBoards(workspaceId) {
  const query = workspaceId ? `?workspace_id=${workspaceId}` : '';
  return apiFetch(`/api/boards${query}`);
}

export async function createBoard(workspaceId, name, backgroundColor) {
  return apiFetch('/api/boards', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, name, background_color: backgroundColor })
  });
}

export async function getBoard(id) {
  return apiFetch(`/api/boards/${id}`);
}

export async function updateBoard(id, updates) {
  return apiFetch(`/api/boards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteBoard(id) {
  return apiFetch(`/api/boards/${id}`, {
    method: 'DELETE'
  });
}

export async function addBoardMember(boardId, email) {
  return apiFetch(`/api/boards/${boardId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function addBoardMemberById(boardId, userId) {
  return apiFetch(`/api/boards/${boardId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  });
}

export async function removeBoardMember(boardId, userId) {
  return apiFetch(`/api/boards/${boardId}/members/${userId}`, {
    method: 'DELETE'
  });
}

export async function getBoardWorkspaceMembers(boardId) {
  return apiFetch(`/api/boards/${boardId}/workspace-members`);
}

export async function createBoardLabel(boardId, name, color) {
  return apiFetch(`/api/boards/${boardId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ name, color })
  });
}
