// client/src/test/roadmapSection.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import CalendarView from '../components/Board/CalendarView';
import { PermissionProvider } from '../context/PermissionContext';

// Mock SocketProvider
vi.mock('../context/SocketProvider', () => ({
  useSocket: () => ({
    unreadCount: 0,
    byBoardUnread: {}
  })
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Hardik', email: 'hardik@example.com', tenant_id: 1, role: 'admin' },
    logoutUser: vi.fn()
  })
}));

describe('Verify Roadmap Section Accessibility', () => {
  const mockWorkspace = {
    id: 10,
    name: 'Product Engineering',
    role: 'admin'
  };

  const mockBoards = [
    { id: 42, name: 'Core Platform Sprint', role: 'admin' },
    { id: 43, name: 'Mobile App Roadmap', role: 'member' }
  ];

  it('renders Roadmap link in Sidebar pointing to active board calendar when boards exist', () => {
    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role="admin">
          <WorkspaceSidebar
            workspaces={[mockWorkspace]}
            activeWorkspace={mockWorkspace}
            boards={mockBoards}
            activeBoardId={42}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    const roadmapLink = screen.getByRole('link', { name: /^roadmap$/i });
    expect(roadmapLink).toBeInTheDocument();
    // Must navigate to the valid board calendar, never a hardcoded '1'
    expect(roadmapLink.getAttribute('href')).toBe('/w/10/p/42/calendar');
    expect(roadmapLink.getAttribute('href')).not.toContain('/p/1/calendar');
  });

  it('renders Roadmap link pointing to /w/:wsId/roadmap when boards are not yet loaded (never hardcoded /p/1/calendar)', () => {
    render(
      <MemoryRouter initialEntries={['/w/10/home']}>
        <PermissionProvider role="admin">
          <WorkspaceSidebar
            workspaces={[mockWorkspace]}
            activeWorkspace={mockWorkspace}
            boards={[]}
            activeBoardId={null}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    const roadmapLink = screen.getByRole('link', { name: /^roadmap$/i });
    expect(roadmapLink).toBeInTheDocument();
    // Must navigate to /w/10/roadmap, NEVER /p/1/calendar
    expect(roadmapLink.getAttribute('href')).toBe('/w/10/roadmap');
    expect(roadmapLink.getAttribute('href')).not.toContain('/p/1/calendar');
  });

  it('highlights the Roadmap navigation item when on /calendar or /roadmap', () => {
    render(
      <MemoryRouter initialEntries={['/w/10/p/42/calendar']}>
        <PermissionProvider role="admin">
          <WorkspaceSidebar
            workspaces={[mockWorkspace]}
            activeWorkspace={mockWorkspace}
            boards={mockBoards}
            activeBoardId={42}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    const roadmapLink = screen.getByRole('link', { name: /^roadmap$/i });
    // Active link classes include primary tint / bold styling
    expect(roadmapLink.className).toContain('text-primary');
  });

  it('renders CalendarView properly with board cards and roadmap timeline details', () => {
    const boardWithCards = {
      id: 42,
      name: 'Q4 Product Roadmap',
      lists: [
        {
          id: 101,
          name: 'In Progress',
          cards: [
            {
              id: 201,
              title: 'OAuth2 Integration',
              due_date: '2026-10-15T10:00:00.000Z',
              priority: 'high'
            },
            {
              id: 202,
              title: 'Database Sharding',
              due_date: '2026-10-20T18:00:00.000Z',
              priority: 'urgent'
            }
          ]
        }
      ]
    };

    render(
      <MemoryRouter initialEntries={['/w/10/p/42/calendar']}>
        <Routes>
          <Route
            path="/w/:workspaceId/p/:boardId/calendar"
            element={<CalendarView board={boardWithCards} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Q4 Product Roadmap')).toBeInTheDocument();
    expect(screen.getByText('OAuth2 Integration')).toBeInTheDocument();
    expect(screen.getByText('Database Sharding')).toBeInTheDocument();
    expect(screen.getAllByText(/2 scheduled/i).length).toBeGreaterThan(0);
  });

  describe('Verify Page Navigation and Board Details Loading', () => {
    it('Active Sprint link points to active board when available, never hardcoded /p/1/board', () => {
      render(
        <MemoryRouter initialEntries={['/w/10/home']}>
          <PermissionProvider role="admin">
            <WorkspaceSidebar
              workspaces={[mockWorkspace]}
              activeWorkspace={mockWorkspace}
              boards={mockBoards}
              activeBoardId={42}
            />
          </PermissionProvider>
        </MemoryRouter>
      );

      const sprintLink = screen.getByRole('link', { name: /active sprint/i });
      expect(sprintLink).toBeInTheDocument();
      expect(sprintLink.getAttribute('href')).toBe('/w/10/p/42/board');
      expect(sprintLink.getAttribute('href')).not.toContain('/p/1/board');
    });

    it('Issues link points to active board list when available, never hardcoded /p/1/list', () => {
      render(
        <MemoryRouter initialEntries={['/w/10/home']}>
          <PermissionProvider role="admin">
            <WorkspaceSidebar
              workspaces={[mockWorkspace]}
              activeWorkspace={mockWorkspace}
              boards={mockBoards}
              activeBoardId={42}
            />
          </PermissionProvider>
        </MemoryRouter>
      );

      const issuesLink = screen.getByRole('link', { name: /issues/i });
      expect(issuesLink).toBeInTheDocument();
      expect(issuesLink.getAttribute('href')).toBe('/w/10/p/42/list');
      expect(issuesLink.getAttribute('href')).not.toContain('/p/1/list');
    });

    it('Active Sprint and Issues fallback safely to /board and /list when no boards exist, preventing 3 active menus bug and 404', () => {
      render(
        <MemoryRouter initialEntries={['/w/10/home']}>
          <PermissionProvider role="admin">
            <WorkspaceSidebar
              workspaces={[mockWorkspace]}
              activeWorkspace={mockWorkspace}
              boards={[]}
              activeBoardId={null}
            />
          </PermissionProvider>
        </MemoryRouter>
      );

      const sprintLink = screen.getByRole('link', { name: /active sprint/i });
      const issuesLink = screen.getByRole('link', { name: /issues/i });
      expect(sprintLink.getAttribute('href')).toBe('/w/10/board');
      expect(issuesLink.getAttribute('href')).toBe('/w/10/list');
      expect(sprintLink.getAttribute('href')).not.toContain('/p/1/');
      expect(issuesLink.getAttribute('href')).not.toContain('/p/1/');
    });
  });
});
