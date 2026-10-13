// client/src/components/shared/Can.jsx
// Declarative RBAC permission gate for React components.

import React from 'react';
import { usePermissions } from '../../context/PermissionContext';

/**
 * <Can permission="task.delete" projectId={boardId} fallback={<DisabledState />}>
 *   <DeleteButton />
 * </Can>
 */
export function Can({ permission, I, projectId = null, fallback = null, children }) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const targetPerm = permission || I;
  const permissionsToCheck = Array.isArray(targetPerm) ? targetPerm : [targetPerm];
  const allowed = permissionsToCheck.some((p) => hasPermission(p, projectId));

  if (!allowed) {
    return fallback;
  }

  return <>{children}</>;
}

export default Can;
