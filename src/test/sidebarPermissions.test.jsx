import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import ActivityPage from '../pages/ActivityPage';
import { PermissionProvider } from '../context/PermissionContext';
import { ToastProvider } from '../components/ui/Toast';
import * as workspaceApi from '../api/workspaces';

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
    user: { id: 101, name: 'Dave Member', email: 'dave@example.com' },
    logoutUser: vi.fn()
  })
}));

// Mock getWorkspaceActivity
vi.mock('../api/workspaces', () => ({
  getWorkspaceActivity: vi.fn().mockResolvedValue({
    activities: [
      {
        id: 1,
        board_id: 1,
        card_id: 10,
        card_title: 'Task Alpha',
        action_type: 'created_card',
        created_at: new Date().toISOString(),
        user_name: 'Dave Member'
      }
    ],
    pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false },
    boards: [{ id: 1, name: 'Sprint Board' }]
  })
}));

const mockWorkspace = {
  id: 10,
  name: 'Engineering Workspace'
};

const mockBoards = [
  { id: 1, name: 'Sprint Board', background_color: 'neutral' }
];

describe('WorkspaceSidebar & ActivityPage Role & Permission Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Releases (Activity) and task links for Team Member role, but hides Setting and Team Member admin links', () => {
    const teamMemberPerms = [
      'project.view',
      'task.view',
      'task.create',
      'task.edit',
      'comment.create',
      'activity.view'
    ];

    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role={{ name: 'Team Member' }} permissions={teamMemberPerms}>
          <WorkspaceSidebar
            activeWorkspace={mockWorkspace}
            workspaces={[mockWorkspace]}
            boards={mockBoards}
            onSelectWorkspace={vi.fn()}
            onSelectBoard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    // Active Sprint, Issues, and Releases (Activity) should be visible
    expect(screen.getByRole('link', { name: /Active Sprint/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Issues/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Releases/i })).toBeInTheDocument();

    // Setting and Workspace Members management links should NOT be visible
    expect(screen.queryByRole('link', { name: /^Setting$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Workspace Members/i })).not.toBeInTheDocument();
  });

  it('hides Releases (Activity), Setting, and Report links for Guest role', () => {
    const guestPerms = [
      'project.view',
      'task.view',
      'comment.create'
    ];

    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role={{ name: 'Guest' }} permissions={guestPerms}>
          <WorkspaceSidebar
            activeWorkspace={mockWorkspace}
            workspaces={[mockWorkspace]}
            boards={mockBoards}
            onSelectWorkspace={vi.fn()}
            onSelectBoard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    // Guest should NOT see Releases, Reports, Workspace Members, or Setting
    expect(screen.queryByRole('link', { name: /Releases/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Workspace Members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Setting$/i })).not.toBeInTheDocument();

    // But should see Active Sprint & Issues
    expect(screen.getByRole('link', { name: /Active Sprint/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Issues/i })).toBeInTheDocument();
  });

  it('renders all navigation links for Admin role including Workspace Members and company Members', () => {
    const adminPerms = [
      'workspace.view',
      'workspace.edit_settings',
      'project.view',
      'task.view',
      'activity.view',
      'member.view',
      'report.view_all',
      'role.view'
    ];

    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role={{ name: 'Admin' }} permissions={adminPerms}>
          <WorkspaceSidebar
            activeWorkspace={mockWorkspace}
            workspaces={[mockWorkspace]}
            boards={mockBoards}
            onSelectWorkspace={vi.fn()}
            onSelectBoard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Active Sprint/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Issues/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Releases/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Workspace Members/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Members$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Setting$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Report/i })).toBeInTheDocument();
  });

  it('highlights ONLY Dashboard as active when a workspace has no boards', () => {
    const adminPerms = [
      'workspace.view',
      'project.view',
      'task.view',
      'member.view'
    ];

    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role={{ name: 'Admin' }} permissions={adminPerms}>
          <WorkspaceSidebar
            activeWorkspace={mockWorkspace}
            workspaces={[mockWorkspace]}
            boards={[]}
            onSelectWorkspace={vi.fn()}
            onSelectBoard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const sprintLink = screen.getByRole('link', { name: /Active Sprint/i });
    const issuesLink = screen.getByRole('link', { name: /Issues/i });

    expect(dashboardLink.className).toContain('bg-primary-tint');
    expect(sprintLink.className).not.toContain('bg-primary-tint');
    expect(issuesLink.className).not.toContain('bg-primary-tint');
  });

  it('renders Access Denied on ActivityPage when activity.view permission is missing without triggering infinite API loop', async () => {
    render(
      <MemoryRouter initialEntries={['/w/10/activity']}>
        <ToastProvider>
          <PermissionProvider role={{ name: 'Guest' }} permissions={['project.view', 'task.view']}>
            <ActivityPage workspace={mockWorkspace} />
          </PermissionProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    // Should display Access Denied banner immediately
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to view the workspace activity feed/i)).toBeInTheDocument();

    // API should not have been called
    expect(workspaceApi.getWorkspaceActivity).not.toHaveBeenCalled();
  });

  it('loads and displays activities on ActivityPage when activity.view permission is present', async () => {
    render(
      <MemoryRouter initialEntries={['/w/10/activity']}>
        <ToastProvider>
          <PermissionProvider role={{ name: 'Team Member' }} permissions={['activity.view']}>
            <ActivityPage workspace={mockWorkspace} />
          </PermissionProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    // Activity feed header should be visible
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(workspaceApi.getWorkspaceActivity).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });
});
