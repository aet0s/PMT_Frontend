// client/src/test/rbacMatrixConsistency.test.jsx
// Vitest component tests (U2) and pure decision matrix comparison (U3) under JSDOM.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider } from '../context/PermissionContext';
import { hasPermissionPure } from '../utils/permissionUtils';
import permissionsData from '../rbac/permissions.json';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import SettingsPage from '../pages/SettingsPage';
import { Can } from '../components/shared/Can';

// Mock SocketProvider
vi.mock('../context/SocketProvider', () => ({
  useSocket: () => ({
    socket: null,
    unreadCount: 0,
    byBoardUnread: {},
    notifications: []
  })
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 42, name: 'Matrix Tester', email: 'tester@example.com' },
    logoutUser: vi.fn()
  })
}));

// Mock API calls
vi.mock('../api/client', () => ({
  apiFetch: vi.fn().mockResolvedValue({})
}));
vi.mock('../api/workspaces', () => ({
  getWorkspaceMembers: vi.fn().mockResolvedValue({ members: [] }),
  getWorkspaceRoles: vi.fn().mockResolvedValue({ roles: [] }),
  getWorkspaceActivity: vi.fn().mockResolvedValue({ activities: [] })
}));

const SYSTEM_ROLE_SNAPSHOTS = permissionsData.systemRoles;

const mockWorkspace = {
  id: 1,
  name: 'Test Matrix Workspace',
  description: 'Testing RBAC Controls'
};

const mockBoard = {
  id: 1,
  workspace_id: 1,
  name: 'Sprint Board 1',
  is_archived: false
};

describe('U2: JSDOM Component Tests Across All System Role Snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const roles = ['Admin', 'Project Manager', 'Team Member', 'Viewer', 'Guest'];

  roles.forEach((roleName) => {
    const roleDef = SYSTEM_ROLE_SNAPSHOTS[roleName];
    const rolePermissions = roleDef?.permissions || [];

    describe(`Role: ${roleName}`, () => {
      it('renders WorkspaceSidebar with appropriate permission-gated navigation items', () => {
        render(
          <MemoryRouter>
            <PermissionProvider workspaceId={1} role={{ name: roleName }} permissions={rolePermissions}>
              <WorkspaceSidebar
                workspaces={[mockWorkspace]}
                activeWorkspace={mockWorkspace}
                boards={[mockBoard]}
                activeBoardId={1}
                onSelectWorkspace={vi.fn()}
                onSelectBoard={vi.fn()}
                onCreateWorkspaceClick={vi.fn()}
                onCreateBoardClick={vi.fn()}
                onViewArchive={vi.fn()}
                onOpenNotifications={vi.fn()}
              />
            </PermissionProvider>
          </MemoryRouter>
        );

        // Kanban Board is visible if role has project.view
        const canViewBoard = hasPermissionPure({ name: roleName }, rolePermissions, 'project.view');
        if (canViewBoard) {
          expect(screen.getByText('Kanban Board')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Kanban Board')).not.toBeInTheDocument();
        }

        // Issues link is visible if role has task.view
        const canViewTasks = hasPermissionPure({ name: roleName }, rolePermissions, 'task.view');
        if (canViewTasks) {
          expect(screen.getByText('Issues')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Issues')).not.toBeInTheDocument();
        }

        // Releases / Activity is visible if role has activity.view
        const canViewActivity = hasPermissionPure({ name: roleName }, rolePermissions, 'activity.view');
        if (canViewActivity) {
          expect(screen.getByText('Releases')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Releases')).not.toBeInTheDocument();
        }
      });

      it('renders Board header action buttons per role permissions', () => {
        render(
          <MemoryRouter>
            <PermissionProvider workspaceId={1} role={{ name: roleName }} permissions={rolePermissions}>
              <div data-testid="board-header">
                <h2>Sprint Board 1</h2>
                <Can permission="project.manage_members">
                  <button data-testid="btn-share-board">Share Board</button>
                </Can>
                <Can permission="project.edit_settings">
                  <button data-testid="btn-edit-board">Board Settings</button>
                </Can>
                <Can permission="project.archive">
                  <button data-testid="btn-archive-board">Archive Board</button>
                </Can>
              </div>
            </PermissionProvider>
          </MemoryRouter>
        );

        // Board header renders board title
        expect(screen.getByText('Sprint Board 1')).toBeInTheDocument();

        const canManageMembers = hasPermissionPure({ name: roleName }, rolePermissions, 'project.manage_members');
        const canEditSettings = hasPermissionPure({ name: roleName }, rolePermissions, 'project.edit_settings');
        const canArchive = hasPermissionPure({ name: roleName }, rolePermissions, 'project.archive');

        expect(!!screen.queryByTestId('btn-share-board')).toBe(canManageMembers);
        expect(!!screen.queryByTestId('btn-edit-board')).toBe(canEditSettings);
        expect(!!screen.queryByTestId('btn-archive-board')).toBe(canArchive);
      });

      it('renders Card actions per role permissions inside Can component', () => {
        render(
          <MemoryRouter>
            <PermissionProvider workspaceId={1} role={{ name: roleName }} permissions={rolePermissions}>
              <div>
                <Can permission="task.create">
                  <button data-testid="btn-create-card">Add Card</button>
                </Can>
                <Can permission="task.edit">
                  <button data-testid="btn-edit-card">Edit Card</button>
                </Can>
                <Can permission="task.delete">
                  <button data-testid="btn-delete-card">Delete Card</button>
                </Can>
                <Can permission="task.move">
                  <button data-testid="btn-move-card">Move Card</button>
                </Can>
                <Can permission="comment.create">
                  <button data-testid="btn-comment">Add Comment</button>
                </Can>
              </div>
            </PermissionProvider>
          </MemoryRouter>
        );

        const canCreate = hasPermissionPure({ name: roleName }, rolePermissions, 'task.create');
        const canEdit = hasPermissionPure({ name: roleName }, rolePermissions, 'task.edit');
        const canDelete = hasPermissionPure({ name: roleName }, rolePermissions, 'task.delete');
        const canMove = hasPermissionPure({ name: roleName }, rolePermissions, 'task.move');
        const canComment = hasPermissionPure({ name: roleName }, rolePermissions, 'comment.create');

        expect(!!screen.queryByTestId('btn-create-card')).toBe(canCreate);
        expect(!!screen.queryByTestId('btn-edit-card')).toBe(canEdit);
        expect(!!screen.queryByTestId('btn-delete-card')).toBe(canDelete);
        expect(!!screen.queryByTestId('btn-move-card')).toBe(canMove);
        expect(!!screen.queryByTestId('btn-comment')).toBe(canComment);
      });

      it('renders Settings navigation tabs per role permissions', () => {
        render(
          <MemoryRouter>
            <PermissionProvider workspaceId={1} role={{ name: roleName }} permissions={rolePermissions}>
              <div>
                <Can permission="workspace.edit">
                  <div data-testid="tab-general-settings">General Settings</div>
                </Can>
                <Can permission="member.view">
                  <div data-testid="tab-members">Members Directory</div>
                </Can>
                <Can permission="role.view">
                  <div data-testid="tab-roles">Roles & Permissions</div>
                </Can>
                <Can permission="audit.view">
                  <div data-testid="tab-audit">Audit Log</div>
                </Can>
              </div>
            </PermissionProvider>
          </MemoryRouter>
        );

        const canEditWs = hasPermissionPure({ name: roleName }, rolePermissions, 'workspace.edit');
        const canViewMembers = hasPermissionPure({ name: roleName }, rolePermissions, 'member.view');
        const canViewRoles = hasPermissionPure({ name: roleName }, rolePermissions, 'role.view');
        const canViewAudit = hasPermissionPure({ name: roleName }, rolePermissions, 'audit.view');

        expect(!!screen.queryByTestId('tab-general-settings')).toBe(canEditWs);
        expect(!!screen.queryByTestId('tab-members')).toBe(canViewMembers);
        expect(!!screen.queryByTestId('tab-roles')).toBe(canViewRoles);
        expect(!!screen.queryByTestId('tab-audit')).toBe(canViewAudit);
      });
    });
  });
});

describe('U3: Client hasPermissionPure vs Server Registry Decision Parity', () => {
  const activePermissions = permissionsData.permissions.filter((p) => !p.planned);

  it('evaluates every testable permission consistently with 0 visible-but-denied or hidden-but-allowed mismatches', () => {
    const roles = ['Admin', 'Project Manager', 'Team Member', 'Viewer', 'Guest'];
    const mismatches = [];

    roles.forEach((roleName) => {
      const roleDef = SYSTEM_ROLE_SNAPSHOTS[roleName];
      const rolePermissions = roleDef?.permissions || [];

      activePermissions.forEach((perm) => {
        const clientDecision = hasPermissionPure({ name: roleName }, rolePermissions, perm.key);
        const serverExpected = rolePermissions.includes(perm.key);

        // Verify forward & reverse alias compatibility
        const aliasKey = permissionsData.aliases[perm.key];
        const isAliasAllowed = !!(aliasKey && rolePermissions.includes(aliasKey));
        const expectedAllowed = Boolean(serverExpected || isAliasAllowed);

        if (clientDecision !== expectedAllowed) {
          mismatches.push({
            role: roleName,
            permission: perm.key,
            clientDecision,
            expectedAllowed,
            type: clientDecision && !expectedAllowed ? 'visible_but_denied' : 'hidden_but_allowed'
          });
        }
      });
    });

    if (mismatches.length > 0) {
      console.error('U3 Mismatches found:', mismatches);
    }

    expect(mismatches).toHaveLength(0);
  });
});
