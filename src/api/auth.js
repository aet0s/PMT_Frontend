import { apiFetch } from './client';

export async function login(email, password, tenant_slug) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenant_slug })
  });
}

export async function verifyLogin2Fa(temp_token, code) {
  return apiFetch('/api/auth/2fa/verify-login', {
    method: 'POST',
    body: JSON.stringify({ temp_token, code })
  });
}

export async function register(name, email, password, inviteToken) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, invite_token: inviteToken })
  });
}

export async function logout() {
  return apiFetch('/api/auth/logout', {
    method: 'POST'
  });
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

export async function updateProfile(data) {
  return apiFetch('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiFetch('/api/files/avatar', {
    method: 'POST',
    body: formData
  });
}

export async function changePassword(currentPassword, newPassword) {
  return apiFetch('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// 2FA Management
export async function get2FaStatus() {
  return apiFetch('/api/auth/2fa/status');
}

export async function generate2FaSetup() {
  return apiFetch('/api/auth/2fa/generate', {
    method: 'POST'
  });
}

export async function confirm2Fa(secret, token) {
  return apiFetch('/api/auth/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify({ secret, token })
  });
}

export async function disable2Fa(password, token) {
  return apiFetch('/api/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, token })
  });
}

// Sessions Management
export async function getSessions() {
  return apiFetch('/api/auth/sessions');
}

export async function revokeSession(sessionId) {
  return apiFetch(`/api/auth/sessions/${sessionId}`, {
    method: 'DELETE'
  });
}

export async function revokeOtherSessions() {
  return apiFetch('/api/auth/sessions/revoke-others', {
    method: 'POST'
  });
}

export async function logoutAll() {
  return apiFetch('/api/auth/logout-all', {
    method: 'POST'
  });
}
