// client/src/components/shared/Can.jsx
// Declarative RBAC permission gate for React components.

import React from 'react';
import { usePermissions } from '../../context/PermissionContext';

/**
 * <Can permission="task.delete" projectId={boardId} fallback={<DisabledState />}>
 *   <DeleteButton />
 * </Can>
 */
export function Can({ permission, projectId = null, fallback = null, children }) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
  const allowed = permissionsToCheck.some((p) => hasPermission(p, projectId));

  if (!allowed) {
    return fallback;
  }

  return <>{children}</>;
}

export default Can;
