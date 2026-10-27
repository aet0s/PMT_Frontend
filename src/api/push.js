import { apiFetch } from './client';

export async function registerPushSubscription(data) {
  return apiFetch('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getPushSubscriptions() {
  return apiFetch('/api/push/subscriptions');
}

export async function deletePushSubscription(id) {
  return apiFetch(`/api/push/subscriptions/${id}`, {
    method: 'DELETE'
  });
}

export async function revokeCurrentDeviceSubscription(data = {}) {
  return apiFetch('/api/push/subscriptions/current', {
    method: 'DELETE',
    body: JSON.stringify(data)
  });
}

export async function sendPushTest() {
  return apiFetch('/api/push/test', {
    method: 'POST'
  });
}
