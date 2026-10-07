import { apiFetch } from './client';

export async function getNotifications({
  page = 1,
  limit = 20,
  cursor = null,
  filter = 'all',
  search = '',
  workspaceId = null,
  boardId = null
} = {}) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set('cursor', String(cursor));
  } else {
    params.set('page', String(page));
  }
  params.set('limit', String(limit));
  if (filter && filter !== 'all') params.set('filter', filter);
  if (search) params.set('search', search);
  if (workspaceId) params.set('workspace_id', String(workspaceId));
  if (boardId) params.set('board_id', String(boardId));

  return apiFetch(`/api/notifications?${params.toString()}`);
}

export async function getUnreadCount() {
  return apiFetch('/api/notifications/unread-count');
}

export async function getNotificationSummary() {
  return apiFetch('/api/notifications/summary');
}

export async function getMutes() {
  return apiFetch('/api/notifications/mutes');
}

export async function muteTarget(targetType, targetId, muteUntil = null) {
  return apiFetch('/api/notifications/mute', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, muteUntil })
  });
}

export async function unmuteTarget(targetType, targetId) {
  return apiFetch('/api/notifications/unmute', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId })
  });
}

export async function markNotificationAsRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markNotificationAsUnread(id) {
  return apiFetch(`/api/notifications/${id}/unread`, { method: 'PATCH' });
}

export async function markAllNotificationsAsRead() {
  return apiFetch('/api/notifications/read-all', { method: 'PATCH' });
}

export async function markBoardNotificationsAsRead(boardId) {
  return apiFetch(`/api/notifications/board/${boardId}/read-all`, { method: 'PATCH' });
}

export async function deleteNotification(id) {
  return apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
}

export async function clearReadNotifications() {
  return apiFetch('/api/notifications/clear/read', { method: 'DELETE' });
}

export async function getNotificationPreferences() {
  return apiFetch('/api/notifications/preferences');
}

export async function updateNotificationPreferences(payload = {}) {
  // Supports both legacy { updates: [...] } / { notify_... } and new { mode, categories, workspace }
  const body = Array.isArray(payload) ? { updates: payload } : payload;
  return apiFetch('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}
