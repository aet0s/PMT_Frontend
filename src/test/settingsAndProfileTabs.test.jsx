import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SettingsPage from '../pages/SettingsPage';
import AccountPage from '../pages/AccountPage';

// Mock contexts
vi.mock('../context/PermissionContext', () => ({
  usePermissions: () => ({
    userRole: 'Admin',
    hasPermission: () => true,
    loading: false
  }),
  PermissionProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    show: vi.fn()
  }),
  ToastProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../lib/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    setDirty: vi.fn()
  })
}));

// Mock lazy components
vi.mock('../pages/settings/tabs/GeneralTab', () => ({
  default: () => <div data-testid="general-tab">General Tab Content</div>
}));
vi.mock('../pages/settings/tabs/ProjectTab', () => ({
  default: () => <div data-testid="project-tab">Project Tab Content</div>
}));
vi.mock('../pages/settings/tabs/NotificationsTab', () => ({
  default: () => <div data-testid="notifications-tab">Notifications Tab Content</div>
}));
vi.mock('../pages/settings/tabs/DataTab', () => ({
  default: () => <div data-testid="data-tab">Data Tab Content</div>
}));
vi.mock('../pages/settings/tabs/SecurityLogTab', () => ({
  default: () => <div data-testid="security-log-tab">Security Log Tab Content</div>
}));
vi.mock('../pages/settings/tabs/RolesTab', () => ({
  default: ({ workspace }) => (
    <div data-testid="roles-tab">
      Roles Tab Content (Workspace: {workspace?.id})
    </div>
  )
}));
vi.mock('../pages/account/tabs/ProfileTab', () => ({
  default: () => <div data-testid="profile-tab">Profile Tab Content</div>
}));
vi.mock('../pages/account/tabs/SecurityTab', () => ({
  default: () => <div data-testid="security-tab">Security Tab Content</div>
}));
vi.mock('../pages/account/tabs/SessionsTab', () => ({
  default: () => <div data-testid="sessions-tab">Sessions Tab Content</div>
}));
vi.mock('../pages/account/tabs/ActivityTab', () => ({
  default: () => <div data-testid="activity-tab">Activity Tab Content</div>
}));
vi.mock('../pages/account/tabs/PreferencesTab', () => ({
  default: () => <div data-testid="preferences-tab">Preferences Tab Content</div>
}));

describe('SettingsPage and AccountPage tab configuration', () => {
  const mockWorkspace = { id: 10, name: 'Main Workspace', company_id: 'default' };

  it('SettingsPage renders workspace tabs and does not render Members, Invitations, or Roles tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/w/10/settings/general']}>
        <Routes>
          <Route
            path="/w/:workspaceId/settings/:tab"
            element={
              <SettingsPage
                workspaces={[mockWorkspace]}
                activeWorkspace={mockWorkspace}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Verify allowed tabs in SettingsPage
    expect(screen.getByRole('button', { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Project Defaults/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data & Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Security Log/i })).toBeInTheDocument();

    // Verify removed tabs are NOT present
    expect(screen.queryByRole('button', { name: /^Members$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Invitations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Roles & Permissions/i })).not.toBeInTheDocument();
  });

  it('AccountPage in workspace context includes the Roles & Permissions tab and renders RolesTab', async () => {
    render(
      <MemoryRouter initialEntries={['/w/10/profile/roles']}>
        <Routes>
          <Route
            path="/w/:workspaceId/profile/:tab"
            element={<AccountPage workspace={mockWorkspace} />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Verify Roles & Permissions tab is present in Profile & Settings
    const rolesTabBtn = screen.getByRole('button', { name: /Roles & Permissions/i });
    expect(rolesTabBtn).toBeInTheDocument();

    // Verify RolesTab component is rendered with workspace context
    await waitFor(() => {
      expect(screen.getByTestId('roles-tab')).toBeInTheDocument();
      expect(screen.getByText(/Roles Tab Content \(Workspace: 10\)/i)).toBeInTheDocument();
    });
  });
});
