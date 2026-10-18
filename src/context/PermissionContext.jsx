import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { useSocket } from './SocketProvider';
import { hasPermissionPure } from '../utils/permissionUtils';

const PermissionContext = createContext({
  userRole: null,
  permissions: [],
  loading: false,
  hasPermission: () => false,
  refetchPermissions: () => {}
});

export function PermissionProvider({
  workspaceId,
  role = null,
  permissions: propPerms = null,
  children
}) {
  const resolvedRole = role ? (typeof role === 'string' ? { name: role } : role) : null;
  const [userRole, setUserRole] = useState(resolvedRole);
  const [permissions, setPermissions] = useState(propPerms || []);
  const [loading, setLoading] = useState(!resolvedRole && !propPerms && !!workspaceId);

  let socket = null;
  try {
    const socketCtx = useSocket();
    socket = socketCtx?.socket;
  } catch (e) {
    // Graceful fallback when rendered without SocketProvider (e.g. tests)
  }

  const fetchPermissions = useCallback(async () => {
    if (propPerms !== null && propPerms !== undefined) {
      setLoading(false);
      return;
    }

    if (!workspaceId) {
      if (!resolvedRole && !propPerms) {
        setUserRole(null);
        setPermissions([]);
      }
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
    if (role) {
      setUserRole(typeof role === 'string' ? { name: role } : role);
    }
  }, [role]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const handleUpdate = () => {
      fetchPermissions();
    };

    socket.on('user:permissions_updated', handleUpdate);
    socket.on('workspace:role_updated', handleUpdate);
    socket.on('workspace:member_updated', handleUpdate);

    return () => {
      socket.off('user:permissions_updated', handleUpdate);
      socket.off('workspace:role_updated', handleUpdate);
      socket.off('workspace:member_updated', handleUpdate);
    };
  }, [socket, workspaceId, fetchPermissions]);

  const hasPermission = useCallback(
    (permissionKey, projectId = null) => {
      return hasPermissionPure(userRole, permissions, permissionKey, projectId);
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
