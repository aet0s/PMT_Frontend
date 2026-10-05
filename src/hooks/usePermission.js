// client/src/hooks/usePermission.js
// Hook for component-level RBAC queries.

import { usePermissions } from '../context/PermissionContext';

export function usePermission(permissionKey, projectId = null) {
  const { hasPermission, loading, userRole, permissions } = usePermissions();

  const allowed = hasPermission(permissionKey, projectId);

  return {
    allowed,
    loading,
    userRole,
    permissions,
    isOwner: userRole?.name === 'Owner' || userRole?.name === 'Super Admin'
  };
}

export default usePermission;
