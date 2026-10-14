import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GeneralTab from '../pages/settings/tabs/GeneralTab';
import ProjectTab from '../pages/settings/tabs/ProjectTab';
import NotificationsTab from '../pages/settings/tabs/NotificationsTab';
import DataTab from '../pages/settings/tabs/DataTab';
import SecurityLogTab from '../pages/settings/tabs/SecurityLogTab';
import * as workspacesApi from '../api/workspaces';
import * as notificationsApi from '../api/notifications';
import * as apiClient from '../api/client';

// Mock contexts
vi.mock('../context/PermissionContext', () => ({
  usePermissions: () => ({
    userRole: { id: 1, name: 'Owner' },
    hasPermission: () => true,
    loading: false
  })
}));

vi.mock('../context/SocketProvider', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    originId: 'test-origin'
  })
}));

const mockToastShow = vi.fn();
vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    show: mockToastShow
  })
}));

describe('Settings Menu Tabs In-Depth Functionality Tests', () => {
  const mockWorkspace = {
    id: 10,
    name: 'Apollo Mission Control',
    description: 'Central engineering workspace',
    company_id: 'default',
    created_at: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------
  // TAB 1: GeneralTab
  // -------------------------------------------------------------
  describe('Tab 1: GeneralTab', () => {
    it('renders workspace details and allows editing and saving', async () => {
      const onWorkspaceUpdated = vi.fn();
      vi.spyOn(workspacesApi, 'updateWorkspace').mockResolvedValue({
        workspace: { ...mockWorkspace, name: 'Apollo Lunar Control' }
      });

      render(
        <GeneralTab
          workspace={mockWorkspace}
          onWorkspaceUpdated={onWorkspaceUpdated}
          setFormDirty={vi.fn()}
        />
      );

      // Verify initial rendering
      const nameInput = screen.getByLabelText(/Workspace Name/i);
      expect(nameInput).toHaveValue('Apollo Mission Control');

      // Edit name
      fireEvent.change(nameInput, { target: { value: 'Apollo Lunar Control' } });
      expect(nameInput).toHaveValue('Apollo Lunar Control');

      // Click Save Changes
      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(workspacesApi.updateWorkspace).toHaveBeenCalledWith(10, {
          name: 'Apollo Lunar Control',
          description: 'Central engineering workspace'
        });
        expect(mockToastShow).toHaveBeenCalledWith(
          'Workspace details updated successfully',
          'success'
        );
      });
    });

    it('opens confirm modal when Archive Workspace is clicked', async () => {
      const onArchiveWorkspace = vi.fn();
      render(
        <GeneralTab
          workspace={mockWorkspace}
          onArchiveWorkspace={onArchiveWorkspace}
          setFormDirty={vi.fn()}
        />
      );

      const archiveBtn = screen.getByRole('button', { name: /Archive Workspace/i });
      fireEvent.click(archiveBtn);

      // Confirm dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to archive "Apollo Mission Control"\?/i)).toBeInTheDocument();
    });

    it('opens confirm modal when Delete Workspace is clicked', async () => {
      const onDeleteWorkspace = vi.fn();
      render(
        <GeneralTab
          workspace={mockWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
          setFormDirty={vi.fn()}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /Delete Workspace/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to permanently delete "Apollo Mission Control"\?/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // TAB 2: ProjectTab
  // -------------------------------------------------------------
  describe('Tab 2: ProjectTab', () => {
    it('renders project defaults and persists updated Kanban rules', async () => {
      const setFormDirty = vi.fn();
      render(<ProjectTab workspace={mockWorkspace} setFormDirty={setFormDirty} />);

      // Verify WIP max input
      const wipInput = screen.getByRole('spinbutton');
      expect(wipInput).toHaveValue(5);

      fireEvent.change(wipInput, { target: { value: '8' } });
      expect(wipInput).toHaveValue(8);

      // Save defaults
      const saveBtn = screen.getByRole('button', { name: /Save Project Defaults/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith(
          expect.stringMatching(/Project defaults saved/i),
          'success'
        );
      });
    });
  });

  // -------------------------------------------------------------
  // TAB 3: NotificationsTab
  // -------------------------------------------------------------
  describe('Tab 3: NotificationsTab', () => {
    it('loads notification preferences and updates them upon save', async () => {
      vi.spyOn(notificationsApi, 'getNotificationPreferences').mockResolvedValue({
        preferences: {
          notify_assignments: true,
          notify_mentions: true,
          notify_due_dates: false
        },
        play_sound: false
      });
      vi.spyOn(notificationsApi, 'updateNotificationPreferences').mockResolvedValue({ success: true });

      render(<NotificationsTab workspace={mockWorkspace} setFormDirty={vi.fn()} />);

      await waitFor(() => {
        expect(notificationsApi.getNotificationPreferences).toHaveBeenCalled();
      });

      // Quick actions: Enable All
      const enableAllBtn = screen.getByRole('button', { name: /Enable All/i });
      fireEvent.click(enableAllBtn);

      // Save preferences
      const saveBtn = screen.getByRole('button', { name: /Save Preferences/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(notificationsApi.updateNotificationPreferences).toHaveBeenCalledWith({
          notify_assignments: true,
          notify_mentions: true,
          notify_due_dates: true,
          play_sound: true,
          sound_effects: true
        });
        expect(mockToastShow).toHaveBeenCalledWith(
          'Notification preferences saved successfully',
          'success'
        );
      });
    });

    it('triggers test chime preview', async () => {
      vi.spyOn(notificationsApi, 'getNotificationPreferences').mockResolvedValue({
        preferences: { notify_assignments: true },
        play_sound: false
      });

      render(<NotificationsTab workspace={mockWorkspace} setFormDirty={vi.fn()} />);

      const testAudioBtn = await screen.findByRole('button', { name: /Play Sample/i });
      fireEvent.click(testAudioBtn);

      expect(mockToastShow).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------
  // TAB 4: DataTab
  // -------------------------------------------------------------
  describe('Tab 4: DataTab', () => {
    it('triggers JSON and CSV exports using boards API', async () => {
      vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
        boards: [
          { id: 101, name: 'Sprint 1', card_count: 12, created_at: '2026-01-02' },
          { id: 102, name: 'Backlog', card_count: 30, created_at: '2026-01-03' }
        ]
      });

      // Mock createObjectURL & revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      render(<DataTab workspace={mockWorkspace} />);

      // Export JSON
      const jsonExportBtn = screen.getByRole('button', { name: /Export Complete Backup \(JSON\)/i });
      fireEvent.click(jsonExportBtn);

      await waitFor(() => {
        expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/boards?workspace_id=10');
        expect(mockToastShow).toHaveBeenCalledWith(
          'Workspace full backup downloaded as JSON',
          'success'
        );
      });

      // Export CSV
      const csvExportBtn = screen.getByRole('button', { name: /Export Summary \(CSV\)/i });
      fireEvent.click(csvExportBtn);

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith(
          'Workspace board summaries downloaded as CSV',
          'success'
        );
      });
    });
  });

  // -------------------------------------------------------------
  // TAB 5: SecurityLogTab
  // -------------------------------------------------------------
  describe('Tab 5: SecurityLogTab', () => {
    it('loads and displays security audit events and supports filtering and export', async () => {
      const mockEvents = [
        {
          id: 1,
          event_type: 'role.permission.update',
          action: 'Updated workspace permissions',
          user_name: 'Admin User',
          user_email: 'admin@example.com',
          ip_address: '192.168.1.100',
          created_at: '2026-01-05T10:00:00Z',
          metadata: { role: 'Project Manager' }
        },
        {
          id: 2,
          event_type: 'auth.login.success',
          action: 'User logged in',
          user_name: 'Regular User',
          user_email: 'user@example.com',
          ip_address: '192.168.1.101',
          created_at: '2026-01-05T11:00:00Z'
        }
      ];

      vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
        events: mockEvents,
        total: 2
      });

      render(<SecurityLogTab workspace={mockWorkspace} />);

      await waitFor(() => {
        expect(apiClient.apiFetch).toHaveBeenCalled();
        expect(screen.getAllByText('role.permission.update').length).toBeGreaterThan(0);
        expect(screen.getAllByText('auth.login.success').length).toBeGreaterThan(0);
      });

      // Filter by category
      const authFilterBtn = screen.getByRole('button', { name: /Auth & Sessions/i });
      fireEvent.click(authFilterBtn);

      await waitFor(() => {
        expect(apiClient.apiFetch).toHaveBeenCalledWith(
          expect.stringContaining('category=auth')
        );
      });

      // Export CSV
      const exportCsvBtn = screen.getByRole('button', { name: /Export CSV/i });
      fireEvent.click(exportCsvBtn);

      expect(mockToastShow).toHaveBeenCalledWith(
        'Security log exported to CSV',
        'success'
      );
    });
  });
});
