// client/src/lib/storage.js
/**
 * Tenant-namespaced localStorage and sessionStorage helpers.
 * Ensures data is isolated per tenant and cleared on logout.
 */

export function getTenantStorageKey(tenantId, key) {
  const t = tenantId ? `t_${tenantId}` : 't_default';
  return `taskflow:${t}:${key}`;
}

export function setTenantItem(tenantId, key, value) {
  try {
    const fullKey = getTenantStorageKey(tenantId, key);
    localStorage.setItem(fullKey, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage set failed:', e);
  }
}

export function getTenantItem(tenantId, key, defaultValue = null) {
  try {
    const fullKey = getTenantStorageKey(tenantId, key);
    const val = localStorage.getItem(fullKey);
    if (val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  } catch {
    return defaultValue;
  }
}

export function removeTenantItem(tenantId, key) {
  try {
    const fullKey = getTenantStorageKey(tenantId, key);
    localStorage.removeItem(fullKey);
  } catch (e) {
    console.warn('localStorage remove failed:', e);
  }
}

export function clearTenantStorage(tenantId) {
  try {
    const prefix = tenantId ? `taskflow:t_${tenantId}:` : 'taskflow:';
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('clearTenantStorage failed:', e);
  }
}

// SessionStorage draft management for comments & descriptions
export function setDraft(tenantId, cardId, type, text) {
  try {
    const key = `draft:${tenantId || 'global'}:${cardId}:${type}`;
    if (!text || text.trim() === '') {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, text);
    }
  } catch (e) {
    console.warn('sessionStorage setDraft failed:', e);
  }
}

export function getDraft(tenantId, cardId, type) {
  try {
    const key = `draft:${tenantId || 'global'}:${cardId}:${type}`;
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function clearDraft(tenantId, cardId, type) {
  try {
    const key = `draft:${tenantId || 'global'}:${cardId}:${type}`;
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn('sessionStorage clearDraft failed:', e);
  }
}
