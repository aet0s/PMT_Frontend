// client/src/utils/permissionUtils.js
// Pure, deterministic RBAC permission evaluator backed by canonical permissions.json

import permissionsData from '../rbac/permissions.json';

const aliases = permissionsData?.aliases || {};

// Precompute reverse alias map
const reverseAliases = {};
for (const [oldKey, newKey] of Object.entries(aliases)) {
  if (!reverseAliases[newKey]) reverseAliases[newKey] = [];
  reverseAliases[newKey].push(oldKey);
}

/**
 * Pure evaluation of whether a user role and permissions set holds a requested permission key.
 * 
 * @param {string|object|null} userRole - The user's role string or role object
 * @param {string[]} userPermissions - List of active permission keys
 * @param {string} permissionKey - The permission key to evaluate
 * @param {number|string|null} [projectId] - Optional project / board ID for scoped evaluation
 * @returns {boolean}
 */
export function hasPermissionPure(userRole, userPermissions = [], permissionKey, projectId = null) {
  if (!permissionKey) return false;
  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name)?.toLowerCase();
  
  // Super Admin / Owner has all permissions
  if (roleName === 'super admin' || roleName === 'owner') return true;


  const perms = Array.isArray(userPermissions) ? userPermissions : [];

  // 1. Direct key match
  if (perms.includes(permissionKey)) return true;

  // 2. Canonical forward alias
  if (aliases[permissionKey] && perms.includes(aliases[permissionKey])) {
    return true;
  }

  // 3. Reverse alias
  if (reverseAliases[permissionKey]) {
    for (const oldKey of reverseAliases[permissionKey]) {
      if (perms.includes(oldKey)) return true;
    }
  }

  return false;
}

export default hasPermissionPure;
