import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import List from '../components/Board/List';
import Board from '../components/Board/Board';
import ProjectTab from '../pages/settings/tabs/ProjectTab';
import * as workspacesApi from '../api/workspaces';

// Mock contexts and router
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@example.com' }
  })
}));

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

// Mock workspaces API module
vi.mock('../api/workspaces', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    autoArchiveWorkspaceCards: vi.fn(),
    updateWorkspace: vi.fn()
  };
});

describe('Workspace Settings & Kanban Flow Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------
  // Test 1: WIP Limit Badge and Alert Banner in List.jsx
  // -------------------------------------------------------------
  describe('WIP Limits on Columns', () => {
    const sampleList = { id: 1, name: 'In Progress', position: 1 };
    const sampleCards = [
      { id: 101, title: 'Task 1', list_id: 1, position: 0 },
      { id: 102, title: 'Task 2', list_id: 1, position: 1 },
      { id: 103, title: 'Task 3', list_id: 1, position: 2 }
    ];

    it('shows WIP limit exceeded alert and count ratio badge when card count > wipLimitMax', () => {
      render(
        <List
          list={sampleList}
          cards={sampleCards}
          wipLimitEnabled={true}
          wipLimitMax={2}
          onCardClick={vi.fn()}
          onCreateCard={vi.fn()}
          onUpdateCard={vi.fn()}
          onDeleteCard={vi.fn()}
          onCopyCard={vi.fn()}
          onUpdateList={vi.fn()}
          onDeleteList={vi.fn()}
        />
      );

      // Verify count ratio badge is "3/2"
      expect(screen.getByText('3/2')).toBeInTheDocument();

      // Verify alert banner is rendered with role="alert"
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/WIP limit exceeded \(3 > 2 max\)/i);
    });

    it('does not show alert banner when card count is within wipLimitMax', () => {
      render(
        <List
          list={sampleList}
          cards={sampleCards.slice(0, 2)}
          wipLimitEnabled={true}
          wipLimitMax={5}
          onCardClick={vi.fn()}
          onCreateCard={vi.fn()}
          onUpdateCard={vi.fn()}
          onDeleteCard={vi.fn()}
          onCopyCard={vi.fn()}
          onUpdateList={vi.fn()}
          onDeleteList={vi.fn()}
        />
      );

      // Verify count ratio badge is "2/5"
      expect(screen.getByText('2/5')).toBeInTheDocument();

      // Verify alert banner is NOT present
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows simple count badge when WIP limits are disabled', () => {
      render(
        <List
          list={sampleList}
          cards={sampleCards}
          wipLimitEnabled={false}
          wipLimitMax={2}
          onCardClick={vi.fn()}
          onCreateCard={vi.fn()}
          onUpdateCard={vi.fn()}
          onDeleteCard={vi.fn()}
          onCopyCard={vi.fn()}
          onUpdateList={vi.fn()}
          onDeleteList={vi.fn()}
        />
      );

      // Should show '3' rather than '3/2'
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // Test 2: Card Sorting in Board.jsx
  // -------------------------------------------------------------
  describe('Card Sorting Order in Board', () => {
    const unsortedCards = [
      { id: 10, title: 'Zebra Task', list_id: 1, position: 2, due_date: '2026-12-01' },
      { id: 20, title: 'Apple Task', list_id: 1, position: 1, due_date: '2026-05-01' },
      { id: 30, title: 'Middle Task', list_id: 1, position: 0, due_date: '2026-08-01' }
    ];

    const createMockBoard = () => ({
      id: 99,
      name: 'Project Apollo',
      lists: [
        {
          id: 1,
          name: 'To Do',
          position: 1,
          cards: [...unsortedCards]
        }
      ]
    });

    it('sorts cards alphabetically by title when defaultCardSort is "title"', () => {
      render(
        <MemoryRouter>
          <Board
            board={createMockBoard()}
            projectDefaults={{ defaultCardSort: 'title', wipLimitEnabled: false, wipLimitMax: 10 }}
            onCardClick={vi.fn()}
            onCreateCard={vi.fn()}
            onUpdateCard={vi.fn()}
            onDeleteCard={vi.fn()}
            onCopyCard={vi.fn()}
            onCreateList={vi.fn()}
            onUpdateList={vi.fn()}
            onDeleteList={vi.fn()}
            onMoveCard={vi.fn()}
            onReorderLists={vi.fn()}
          />
        </MemoryRouter>
      );

      const listColumn = screen.getByRole('heading', { level: 3, name: 'To Do' }).closest('[id^="list-"]');
      const titles = within(listColumn).getAllByRole('heading', { level: 4 }).map((el) => el.textContent);
      expect(titles).toEqual(['Apple Task', 'Middle Task', 'Zebra Task']);
    });

    it('sorts cards chronologically by due_date when defaultCardSort is "due_date"', () => {
      render(
        <MemoryRouter>
          <Board
            board={createMockBoard()}
            projectDefaults={{ defaultCardSort: 'due_date', wipLimitEnabled: false, wipLimitMax: 10 }}
            onCardClick={vi.fn()}
            onCreateCard={vi.fn()}
            onUpdateCard={vi.fn()}
            onDeleteCard={vi.fn()}
            onCopyCard={vi.fn()}
            onCreateList={vi.fn()}
            onUpdateList={vi.fn()}
            onDeleteList={vi.fn()}
            onMoveCard={vi.fn()}
            onReorderLists={vi.fn()}
          />
        </MemoryRouter>
      );

      const listColumn = screen.getByRole('heading', { level: 3, name: 'To Do' }).closest('[id^="list-"]');
      const titles = within(listColumn).getAllByRole('heading', { level: 4 }).map((el) => el.textContent);
      expect(titles).toEqual(['Apple Task', 'Middle Task', 'Zebra Task']);
    });

    it('sorts cards by position when defaultCardSort is "position"', () => {
      render(
        <MemoryRouter>
          <Board
            board={createMockBoard()}
            projectDefaults={{ defaultCardSort: 'position', wipLimitEnabled: false, wipLimitMax: 10 }}
            onCardClick={vi.fn()}
            onCreateCard={vi.fn()}
            onUpdateCard={vi.fn()}
            onDeleteCard={vi.fn()}
            onCopyCard={vi.fn()}
            onCreateList={vi.fn()}
            onUpdateList={vi.fn()}
            onDeleteList={vi.fn()}
            onMoveCard={vi.fn()}
            onReorderLists={vi.fn()}
          />
        </MemoryRouter>
      );

      const listColumn = screen.getByRole('heading', { level: 3, name: 'To Do' }).closest('[id^="list-"]');
      const titles = within(listColumn).getAllByRole('heading', { level: 4 }).map((el) => el.textContent);
      expect(titles).toEqual(['Middle Task', 'Apple Task', 'Zebra Task']);
    });
  });

  // -------------------------------------------------------------
  // Test 3: Auto-Archive Button & Action
  // -------------------------------------------------------------
  describe('Auto-Archive Action in ProjectTab', () => {
    it('executes manual auto-archive trigger and shows toast with count', async () => {
      const mockWorkspace = {
        id: 77,
        name: 'Operation Aurora',
        settings: {
          project_defaults: {
            autoArchiveDays: '30'
          }
        }
      };

      workspacesApi.autoArchiveWorkspaceCards.mockResolvedValue({
        archived_count: 4
      });

      render(<ProjectTab workspace={mockWorkspace} setFormDirty={vi.fn()} />);

      const runArchiveBtn = screen.getByRole('button', { name: /Run Auto-Archive Now/i });
      expect(runArchiveBtn).toBeInTheDocument();

      fireEvent.click(runArchiveBtn);

      await waitFor(() => {
        expect(workspacesApi.autoArchiveWorkspaceCards).toHaveBeenCalledWith(77, 30);
        expect(mockToastShow).toHaveBeenCalledWith(
          expect.stringMatching(/Auto-archived 4 completed task/i),
          'success'
        );
      });
    });
  });
});
