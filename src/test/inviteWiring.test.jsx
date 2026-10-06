import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InviteModal from '../components/Board/InviteModal';
import * as invitationsApi from '../api/invitations';
import * as boardsApi from '../api/boards';
import * as workspacesApi from '../api/workspaces';

describe('InviteModal and Members Page Wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(boardsApi, 'getBoards').mockResolvedValue({ boards: [] });
    vi.spyOn(workspacesApi, 'getWorkspaceRoles').mockResolvedValue({ roles: [] });
  });

  it('renders InviteModal with workspace context even when board is null', () => {
    const mockWorkspace = { id: 10, name: 'Engineering Workspace' };
    const mockOnClose = vi.fn();

    render(
      <InviteModal
        isOpen={true}
        onClose={mockOnClose}
        currentWorkspace={mockWorkspace}
        workspaces={[mockWorkspace]}
        currentBoard={null}
      />
    );

    expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    expect(screen.getByText('Grant workspace & board level access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@company.com')).toBeInTheDocument();
  });

  it('handles invitation submission, shows copy button, and copies link to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const mockWorkspace = { id: 10, name: 'Engineering Workspace' };
    const mockInviteResponse = {
      requires_registration: true,
      invite_token: 'acme.token123.sig456',
      invite_url: 'https://pmt.solarman.in/register?invite_token=acme.token123.sig456&email=colleague%40company.com',
      message: 'Invitation link generated! Copy and share the registration link below:'
    };

    vi.spyOn(invitationsApi, 'inviteMembers').mockResolvedValue(mockInviteResponse);

    render(
      <InviteModal
        isOpen={true}
        onClose={vi.fn()}
        currentWorkspace={mockWorkspace}
        workspaces={[mockWorkspace]}
        currentBoard={null}
      />
    );

    // Enter email
    const emailInput = screen.getByPlaceholderText('user@company.com');
    fireEvent.change(emailInput, { target: { value: 'colleague@company.com' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Send Invitation/i });
    fireEvent.click(submitBtn);

    // Verify invitation result appears
    await waitFor(() => {
      expect(screen.getByText(/Invitation Created/i)).toBeInTheDocument();
    });

    // Verify invite URL is populated
    const linkInput = screen.getByDisplayValue('https://pmt.solarman.in/register?invite_token=acme.token123.sig456&email=colleague%40company.com');
    expect(linkInput).toBeInTheDocument();

    // Copy link
    const copyBtn = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('https://pmt.solarman.in/register?invite_token=acme.token123.sig456&email=colleague%40company.com');
    await waitFor(() => {
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });
  });

  it('renders roles from matrix in InviteModal and passes selected role_id', async () => {
    const mockWorkspace = { id: 10, name: 'Engineering Workspace' };
    const mockRoles = [
      { id: 1, name: 'Owner', is_system: 1, permission_keys: ['all'] },
      { id: 2, name: 'Project Manager', is_system: 0, permission_keys: ['project.view', 'task.create'] },
      { id: 3, name: 'Team Member', is_system: 1, permission_keys: ['project.view'] }
    ];

    vi.spyOn(workspacesApi, 'getWorkspaceRoles').mockResolvedValue({ roles: mockRoles });
    const inviteSpy = vi.spyOn(invitationsApi, 'inviteMembers').mockResolvedValue({
      requires_registration: true,
      invite_token: 'token123',
      role_name: 'Team Member'
    });

    render(
      <InviteModal
        isOpen={true}
        onClose={vi.fn()}
        currentWorkspace={mockWorkspace}
        workspaces={[mockWorkspace]}
        currentBoard={null}
      />
    );

    // Wait for roles to load
    await waitFor(() => {
      expect(screen.getByText(/Team Member/i)).toBeInTheDocument();
    });

    // Enter email
    const emailInput = screen.getByPlaceholderText('user@company.com');
    fireEvent.change(emailInput, { target: { value: 'pm@company.com' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Send Invitation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith(
        'pm@company.com',
        10,
        [],
        expect.any(Number)
      );
    });
  });
});
