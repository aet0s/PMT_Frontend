import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Can } from '../components/shared/Can';
import * as PermissionContextModule from '../context/PermissionContext';

describe('Can component and usePermissions gating', () => {
  it('renders children when user has permission', () => {
    vi.spyOn(PermissionContextModule, 'usePermissions').mockReturnValue({
      userRole: { name: 'Member' },
      permissions: ['task.edit'],
      loading: false,
      hasPermission: (perm) => perm === 'task.edit'
    });

    render(
      <Can permission="task.edit" fallback={<span>No access</span>}>
        <button>Edit Task</button>
      </Can>
    );

    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(screen.queryByText('No access')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    vi.spyOn(PermissionContextModule, 'usePermissions').mockReturnValue({
      userRole: { name: 'Viewer' },
      permissions: ['task.view'],
      loading: false,
      hasPermission: (perm) => perm === 'task.view'
    });

    render(
      <Can permission="task.delete" fallback={<span data-testid="fallback">Access Denied</span>}>
        <button>Delete Task</button>
      </Can>
    );

    expect(screen.queryByText('Delete Task')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders children when any permission in array matches', () => {
    vi.spyOn(PermissionContextModule, 'usePermissions').mockReturnValue({
      userRole: { name: 'Member' },
      permissions: ['task.create'],
      loading: false,
      hasPermission: (perm) => perm === 'task.create'
    });

    render(
      <Can permission={['task.edit', 'task.create']}>
        <div>Create or Edit</div>
      </Can>
    );

    expect(screen.getByText('Create or Edit')).toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    vi.spyOn(PermissionContextModule, 'usePermissions').mockReturnValue({
      userRole: null,
      permissions: [],
      loading: true,
      hasPermission: () => false
    });

    const { container } = render(
      <Can permission="task.create">
        <div>Should Not Render</div>
      </Can>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
