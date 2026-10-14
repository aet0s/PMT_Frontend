import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MembersPage from '../pages/MembersPage';
import CompanyMembersPage from '../pages/CompanyMembersPage';
import { PermissionProvider } from '../context/PermissionContext';
import { ToastProvider } from '../components/ui/Toast';
import * as workspacesApi from '../api/workspaces';
import * as invitationsApi from '../api/invitations';

const mockWorkspace = {
  id: 10,
  name: 'Core Engineering'
};

const mockWorkspaceMembers = [
  {
    id: 1,
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'Admin',
    is_owner: false,
    boards: [{ id: 101, name: 'Sprint Alpha' }]
  },
  {
    id: 2,
    name: 'Bob Developer',
    email: 'bob@example.com',
    role: 'Team Member',
    is_owner: false,
    boards: []
  }
];

const mockCompanyMembersData = {
  members: [
    {
      id: 1,
      name: 'Alice Admin',
      email: 'alice@example.com',
      role: 'Admin',
      is_owner: false,
      workspaces: [{ id: 10, name: 'Core Engineering', role: 'Admin', role_id: 2 }],
      boards: [{ id: 101, name: 'Sprint Alpha', workspace_id: 10, role: 'member' }]
    },
    {
      id: 2,
      name: 'Bob Developer',
      email: 'bob@example.com',
      role: 'Team Member',
      is_owner: false,
      workspaces: [{ id: 10, name: 'Core Engineering', role: 'Team Member', role_id: 3 }],
      boards: []
    }
  ],
  workspaces: [{ id: 10, name: 'Core Engineering' }, { id: 20, name: 'Design Studio' }],
  boards: [{ id: 101, name: 'Sprint Alpha', workspace_id: 10 }],
  roles: [
    { id: 1, name: 'Owner', is_system: 1 },
    { id: 2, name: 'Admin', is_system: 1 },
    { id: 3, name: 'Team Member', is_system: 1 },
    { id: 4, name: 'Viewer', is_system: 1 }
  ],
  invitations: [
    {
      id: 501,
      email: 'pending.dev@example.com',
      workspace_name: 'Core Engineering',
      role_name: 'Team Member',
      board_names: ['Sprint Alpha'],
      token: 'tok-abc-123',
      created_at: new Date().toISOString()
    }
  ]
};

describe('Workspace Members Page & Company Members Page Refactoring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(workspacesApi, 'getWorkspaceMembers').mockResolvedValue({
      members: mockWorkspaceMembers,
      workspace_name: 'Core Engineering'
    });
    vi.spyOn(workspacesApi, 'getCompanyMembers').mockResolvedValue(mockCompanyMembersData);
    vi.spyOn(workspacesApi, 'removeWorkspaceMember').mockResolvedValue({ success: true });
    vi.spyOn(workspacesApi, 'updateCompanyMemberRole').mockResolvedValue({ success: true });
    vi.spyOn(workspacesApi, 'assignCompanyMemberWorkspaces').mockResolvedValue({ success: true });
    vi.spyOn(workspacesApi, 'assignCompanyMemberBoards').mockResolvedValue({ success: true });
    vi.spyOn(workspacesApi, 'removeCompanyMember').mockResolvedValue({ success: true });
    vi.spyOn(invitationsApi, 'createInvitation').mockResolvedValue({
      requires_registration: true,
      invite_token: 'signed-token-123',
      invite_url: 'http://localhost:5173/register?invite_token=signed-token-123',
      message: 'Invitation link generated!'
    });
  });

  describe('Workspace Members Page (Strictly workspace-scoped & read-only with Remove)', () => {
    it('renders workspace members page with name, email, boards, role and Remove button only', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.remove']}>
              <MembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      // Title & description
      expect(await screen.findByText('Workspace Members')).toBeInTheDocument();
      expect(screen.getByText(/Core Engineering/i)).toBeInTheDocument();

      // Check member rows
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sprint Alpha')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();

      expect(screen.getByText('Bob Developer')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.getByText('No boards assigned')).toBeInTheDocument();

      // Action: Remove buttons should be present
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons.length).toBe(2);

      // NO Invite button and NO Pending Invitations tab should exist
      expect(screen.queryByRole('button', { name: /Invite/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Pending Invitations/i)).not.toBeInTheDocument();
    });

    it('triggers remove confirmation and calls removeWorkspaceMember API', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.remove']}>
              <MembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await screen.findByText('Bob Developer');

      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[1]); // Remove Bob

      // Confirm dialog should open
      expect(screen.getByText(/Remove Member from Workspace/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove "Bob Developer"/i)).toBeInTheDocument();

      // Click Confirm
      const confirmBtn = screen.getByRole('button', { name: 'Remove Member' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(workspacesApi.removeWorkspaceMember).toHaveBeenCalledWith(10, 2);
      });
    });
  });

  describe('Company Members Page (Central organization directory with actions & single invite)', () => {
    it('renders company members with tabs, count badges, and 2 action buttons (Edit & Remove)', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.assign_role', 'member.remove', 'member.invite']}>
              <CompanyMembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      // Title & single Invite button
      expect(await screen.findByRole('heading', { name: /^Members$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Invite Member/i })).toBeInTheDocument();

      // Tabs
      expect(screen.getByRole('tab', { name: /All Members/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Pending Invitations/i })).toBeInTheDocument();

      // Member details
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();

      // Table shows count badges for workspaces and boards (not bloated badge lists)
      expect(screen.getAllByText(/1 Workspace/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1 Board/i).length).toBeGreaterThan(0);

      // Single Action column with exactly 2 buttons: Edit and Remove
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      expect(editButtons.length).toBeGreaterThan(0);
      expect(removeButtons.length).toBeGreaterThan(0);

      // Clicking Edit opens the unified Edit Employee modal
      fireEvent.click(editButtons[0]);
      expect(await screen.findByText('Edit Employee Access & Role')).toBeInTheDocument();
      expect(screen.getByText('Organization Role')).toBeInTheDocument();
      expect(screen.getAllByText('Workspaces Assigned').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Boards Assigned').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('opens Invite Member modal and sends invitation with single link generated', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.assign_role', 'member.remove', 'member.invite']}>
              <CompanyMembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: /^Members$/i });

      // Click Invite Member
      const inviteBtn = screen.getByRole('button', { name: /Invite Member/i });
      fireEvent.click(inviteBtn);

      // Modal appears
      expect(screen.getByText('Invite Member to Organization')).toBeInTheDocument();

      // Enter email
      const emailInput = screen.getByPlaceholderText('colleague@example.com');
      fireEvent.change(emailInput, { target: { value: 'new.engineer@example.com' } });

      // Click Send Invitation
      const sendBtn = screen.getByRole('button', { name: /Send Invitation|Generate Invitation/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(invitationsApi.createInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'new.engineer@example.com',
            workspace_id: 10
          })
        );
      });

      // Link generated card appears
      const linkCards = await screen.findAllByText(/Invitation (Link Generated|Sent by Email)/i);
      expect(linkCards.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });

    it('can switch to Pending Invitations tab and see pending invitations', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.assign_role', 'member.remove', 'member.invite']}>
              <CompanyMembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: /^Members$/i });

      const pendingTab = screen.getByRole('tab', { name: /Pending Invitations/i });
      fireEvent.click(pendingTab);

      expect(await screen.findByText('pending.dev@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy Link' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    });

    it('triggers remove confirmation and calls removeCompanyMember API when removing a member from company', async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <PermissionProvider role={{ name: 'Admin' }} permissions={['member.view', 'member.assign_role', 'member.remove', 'member.invite']}>
              <CompanyMembersPage workspace={mockWorkspace} />
            </PermissionProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: /^Members$/i });

      const removeButtons = screen.getAllByRole('button', { name: /^Remove$/i });
      fireEvent.click(removeButtons[0]);

      expect(screen.getByText('Remove Member from Company')).toBeInTheDocument();
      const modalRemoveBtn = screen.getByRole('button', { name: /^Remove Member$/i });
      fireEvent.click(modalRemoveBtn);

      await waitFor(() => {
        expect(workspacesApi.removeCompanyMember).toHaveBeenCalledWith(10, expect.any(Number));
      });
    });
  });
});
