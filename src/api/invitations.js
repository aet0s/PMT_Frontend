import { apiFetch } from './client';

export async function inviteMembers(email, workspaceId, boardIds = []) {
  return apiFetch('/api/invitations', {
    method: 'POST',
    body: JSON.stringify({ email, workspace_id: workspaceId, board_ids: boardIds })
  });
}

export async function verifyInvitationToken(token) {
  return apiFetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`);
}

export async function getWorkspaceInvitations(workspaceId) {
  return apiFetch(`/api/invitations?workspace_id=${workspaceId}`);
}

export async function revokeInvitation(invitationId) {
  return apiFetch(`/api/invitations/${invitationId}`, {
    method: 'DELETE'
  });
}
