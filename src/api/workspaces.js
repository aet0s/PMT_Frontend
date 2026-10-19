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

export async function uploadWorkspaceIcon(workspaceId, file) {
  const formData = new FormData();
  formData.append('icon', file);
  return apiFetch(`/api/workspaces/${workspaceId}/icon`, {
    method: 'POST',
    body: formData
  });
}

export async function removeWorkspaceIcon(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/icon`, {
    method: 'DELETE'
  });
}

export async function autoArchiveWorkspaceCards(workspaceId, days = 7) {
  return apiFetch(`/api/workspaces/${workspaceId}/auto-archive`, {
    method: 'POST',
    body: JSON.stringify({ days })
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

export async function getCompanyMembers(workspaceId, { page = 1, limit = 20, search = '', filterWorkspaceId = 'all' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (filterWorkspaceId && filterWorkspaceId !== 'all') params.set('workspace_id', String(filterWorkspaceId));
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/company-members${query}`);
}

export async function updateCompanyMemberRole(workspaceId, userId, payload) {
  const body = typeof payload === 'object' && payload !== null && 'role_id' in payload
    ? payload
    : { role_id: payload };
  return apiFetch(`/api/workspaces/${workspaceId}/company-members/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function assignCompanyMemberWorkspaces(workspaceId, userId, workspaceIds, roleId) {
  return apiFetch(`/api/workspaces/${workspaceId}/company-members/${userId}/workspaces`, {
    method: 'POST',
    body: JSON.stringify({ workspace_ids: workspaceIds, role_id: roleId })
  });
}

export async function assignCompanyMemberBoards(workspaceId, userId, boardIds) {
  return apiFetch(`/api/workspaces/${workspaceId}/company-members/${userId}/boards`, {
    method: 'POST',
    body: JSON.stringify({ board_ids: boardIds })
  });
}

export async function removeCompanyMember(workspaceId, userId) {
  return apiFetch(`/api/workspaces/${workspaceId}/company-members/${userId}`, {
    method: 'DELETE'
  });
}

export async function getWorkspaceIssues(workspaceId, {
  page = 1,
  limit = 20,
  boardId = null,
  search = '',
  listId = null,
  stage = 'all',
  assigneeId = null,
  assignerId = null,
  dueDate = 'all',
  sort = 'newest'
} = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (boardId) params.set('board_id', String(boardId));
  if (search) params.set('search', search);
  if (listId) params.set('list_id', String(listId));
  if (stage && stage !== 'all') params.set('stage', stage);
  if (assigneeId && assigneeId !== 'all') params.set('assignee_id', String(assigneeId));
  if (assignerId && assignerId !== 'all') params.set('assigner_id', String(assignerId));
  if (dueDate && dueDate !== 'all') params.set('due_date', dueDate);
  if (sort) params.set('sort', sort);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/issues${query}`);
}

export async function deactivateMember(workspaceId, userId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/deactivate`, {
    method: 'POST'
  });
}

export async function reactivateMember(workspaceId, userId) {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/reactivate`, {
    method: 'POST'
  });
}

export async function getWorkspaceDailyTracker(workspaceId, {
  date,
  mode = 'created',
  workspaceId: filterWsId,
  labelId,
  boardId,
  search,
  sort,
  page = 1,
  limit = 20
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (mode) params.set('mode', mode);
  if (filterWsId) params.set('workspace_id', String(filterWsId));
  if (labelId && labelId !== 'all') params.set('label_id', String(labelId));
  if (boardId && boardId !== 'all') params.set('board_id', String(boardId));
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/daily-tracker${query}`);
}

export async function getWorkspaceDailyTrackerPeople(workspaceId, { date } = {}) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/daily-tracker/people${query}`);
}

export async function getWorkspaceLeaveDays(workspaceId, { date } = {}) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch(`/api/workspaces/${workspaceId}/leave-days${query}`);
}

export async function createWorkspaceLeaveDay(workspaceId, { user_id, date, reason }) {
  return apiFetch(`/api/workspaces/${workspaceId}/leave-days`, {
    method: 'POST',
    body: JSON.stringify({ user_id, date, reason })
  });
}

export async function getWorkspacePendingCheckins(workspaceId) {
  return apiFetch(`/api/workspaces/${workspaceId}/checkins/pending`);
}


