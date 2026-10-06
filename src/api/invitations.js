import { apiFetch } from './client';

export async function inviteMembers(email, workspaceId, boardIds = [], roleId = null) {
  const payload = { email, workspace_id: workspaceId, board_ids: boardIds };
  if (roleId) payload.role_id = roleId;
  return apiFetch('/api/invitations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function verifyInvitationToken(token) {
  return apiFetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`);
}

export async function getWorkspaceInvitations(workspaceId) {
  return apiFetch(`/api/invitations?workspace_id=${workspaceId}`);
}

export async function regenerateInvitation(invitationId) {
  return apiFetch(`/api/invitations/${invitationId}/regenerate`, {
    method: 'POST'
  });
}

export async function revokeInvitation(invitationId) {
  return apiFetch(`/api/invitations/${invitationId}`, {
    method: 'DELETE'
  });
}
