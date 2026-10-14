import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Board from '../components/Board/Board';
import { PermissionProvider } from '../context/PermissionContext';

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
    user: { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'admin' }
  })
}));

describe('Board Top-Right Filters & Detailed Filter Section', () => {
  const mockBoard = {
    id: 101,
    name: 'Product Roadmap',
    background_color: 'bg-board-neutral',
    members: [
      { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
      { id: 2, name: 'Bob Jones', email: 'bob@example.com' }
    ],
    labels: [
      { id: 11, name: 'Frontend', color: 'blue' },
      { id: 12, name: 'Backend', color: 'green' }
    ],
    lists: [
      {
        id: 1001,
        name: 'To Do',
        cards: [
          {
            id: 201,
            title: 'Design Filter Bar',
            description: 'Implement filter dropdowns and detailed section',
            list_id: 1001,
            due_date: new Date(Date.now() + 86400000).toISOString(),
            members: [{ id: 1, name: 'Alice Smith' }],
            assigners: [{ id: 2, name: 'Bob Jones' }],
            labels: [{ id: 11, name: 'Frontend', color: 'blue' }],
            is_complete: false
          }
        ]
      },
      {
        id: 1002,
        name: 'Done',
        cards: [
          {
            id: 202,
            title: 'Setup Database',
            description: 'Run SQL migrations',
            list_id: 1002,
            due_date: null,
            members: [{ id: 2, name: 'Bob Jones' }],
            assigners: [{ id: 1, name: 'Alice Smith' }],
            labels: [{ id: 12, name: 'Backend', color: 'green' }],
            is_complete: true
          }
        ]
      }
    ]
  };

  it('removes Create Task button from top right and renders filter triggers instead', () => {
    render(
      <MemoryRouter initialEntries={['/b/101']}>
        <PermissionProvider role="admin">
          <Board
            board={mockBoard}
            onUpdateBoard={vi.fn()}
            onCreateCard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    // Create Task button should not be in the board top area
    expect(screen.queryByRole('button', { name: /Create Task/i })).not.toBeInTheDocument();

    // Filter controls should be present
    expect(screen.getByRole('button', { name: /Toggle detailed filters/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Filter by label$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Filter by date$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Filter by assignee$/i })).toBeInTheDocument();
  });

  it('toggles detailed filter section with label, date, list, assignee, and assigner controls', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/b/101']}>
        <PermissionProvider role="admin">
          <Board
            board={mockBoard}
            onUpdateBoard={vi.fn()}
            onCreateCard={vi.fn()}
          />
        </PermissionProvider>
      </MemoryRouter>
    );

    // Click Filters toggle button
    const filtersBtn = screen.getByRole('button', { name: /Toggle detailed filters/i });
    expect(filtersBtn).toHaveAttribute('aria-expanded', 'false');
    await user.click(filtersBtn);
    expect(filtersBtn).toHaveAttribute('aria-expanded', 'true');

    // Detailed filter section should be visible
    expect(screen.getByText('Detailed Board Filters')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Detailed filter by label/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Detailed filter by date/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Detailed filter by list/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Detailed filter by assignee/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Detailed filter by assigner/i })).toBeInTheDocument();

    // Close button should collapse the section
    const closeBtn = screen.getByRole('button', { name: /Close filter section/i });
    await user.click(closeBtn);
    expect(filtersBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
