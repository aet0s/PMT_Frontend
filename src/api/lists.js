import { apiFetch } from './client';

export async function createList(boardId, name, position) {
  return apiFetch('/api/lists', {
    method: 'POST',
    body: JSON.stringify({ board_id: boardId, name, position })
  });
}

export async function updateList(id, updates) {
  return apiFetch(`/api/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteList(id) {
  return apiFetch(`/api/lists/${id}`, {
    method: 'DELETE'
  });
}
