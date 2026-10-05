import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

const PermissionContext = createContext({
  userRole: null,
  permissions: [],
  loading: false,
  hasPermission: () => false,
  refetchPermissions: () => {}
});

export function PermissionProvider({ workspaceId, children }) {
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!workspaceId) {
      setUserRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch(`/api/workspaces/${workspaceId}/my-permissions`);
      setUserRole(data.role || null);
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error('Failed to fetch user permissions:', err);
      setUserRole(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permissionKey, projectId = null) => {
      if (!permissionKey) return true;
      if (userRole?.name === 'Super Admin' || userRole?.name === 'Owner') return true;

      // Direct match
      if (permissions.includes(permissionKey)) return true;

      // Legacy aliases
      const aliases = {
        'board.create': 'project.create',
        'board.edit_settings': 'project.edit_settings',
        'board.delete': 'project.delete',
        'board.manage_members': 'project.manage_members',
        'card.create': 'task.create',
        'card.edit': 'task.edit',
        'card.delete': 'task.delete',
        'card.move': 'task.move',
        'card.comment': 'comment.create',
        'card.manage_attachments': 'attachment.upload',
        'card.assign_members': 'task.assign',
        'member.view_all': 'member.view',
        'workspace.edit_settings': 'workspace.edit',
        'workspace.manage_roles': 'role.create',
        'workspace.invite_members': 'member.invite',
        'role.manage': 'role.view'
      };

      if (aliases[permissionKey] && permissions.includes(aliases[permissionKey])) {
        return true;
      }

      // Check reverse
      for (const [oldKey, newKey] of Object.entries(aliases)) {
        if (newKey === permissionKey && permissions.includes(oldKey)) {
          return true;
        }
      }

      return false;
    },
    [userRole, permissions]
  );

  return (
    <PermissionContext.Provider
      value={{
        userRole,
        permissions,
        loading,
        hasPermission,
        refetchPermissions: fetchPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
