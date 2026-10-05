import { apiFetch } from './client';

export async function createCard(listId, title, description, position, dueDate) {
  return apiFetch('/api/cards', {
    method: 'POST',
    body: JSON.stringify({ list_id: listId, title, description, position, due_date: dueDate })
  });
}

export async function updateCard(id, updates) {
  return apiFetch(`/api/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteCard(id) {
  return apiFetch(`/api/cards/${id}`, {
    method: 'DELETE'
  });
}

export async function toggleCardLabel(cardId, labelId) {
  return apiFetch(`/api/cards/${cardId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ label_id: labelId })
  });
}

export async function toggleCardMember(cardId, userId) {
  return apiFetch(`/api/cards/${cardId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  });
}

export async function uploadAttachment(cardId, file) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch(`/api/cards/${cardId}/attachments`, {
    method: 'POST',
    body: formData
  });
}

export async function addLinkAttachment(cardId, linkUrl, displayName) {
  return apiFetch(`/api/cards/${cardId}/attachments`, {
    method: 'POST',
    body: JSON.stringify({ link_url: linkUrl, display_name: displayName })
  });
}

export async function deleteAttachment(attachmentId) {
  return apiFetch(`/api/cards/attachments/${attachmentId}`, {
    method: 'DELETE'
  });
}

export async function addComment(cardId, body) {
  return apiFetch(`/api/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

export async function deleteComment(commentId) {
  return apiFetch(`/api/cards/comments/${commentId}`, {
    method: 'DELETE'
  });
}

export async function addChecklist(cardId, title) {
  return apiFetch(`/api/cards/${cardId}/checklists`, {
    method: 'POST',
    body: JSON.stringify({ title })
  });
}

export async function deleteChecklist(checklistId) {
  return apiFetch(`/api/cards/checklists/${checklistId}`, {
    method: 'DELETE'
  });
}

export async function addChecklistItem(checklistId, text) {
  return apiFetch('/api/cards/checklist-items', {
    method: 'POST',
    body: JSON.stringify({ checklist_id: checklistId, text })
  });
}

export async function updateChecklistItem(itemId, updates) {
  return apiFetch(`/api/cards/checklist-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteChecklistItem(itemId) {
  return apiFetch(`/api/cards/checklist-items/${itemId}`, {
    method: 'DELETE'
  });
}
