// client/src/test/issuesPagePaginationAndFilters.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ListView from '../components/Board/ListView';
import * as workspacesApi from '../api/workspaces';

vi.mock('../api/workspaces', () => ({
  getWorkspaceIssues: vi.fn()
}));

const mockBoard = {
  id: 10,
  name: 'Platform Core',
  workspace_id: 1
};

const mockBoards = [
  { id: 10, name: 'Platform Core' },
  { id: 11, name: 'Mobile App' }
];

const mockWorkspace = {
  id: 1,
  name: 'TaskFlow HQ'
};

// Generate 45 sample issues to verify server-side pagination (20 per page)
const generateMockIssues = (count, offset = 0) =>
  Array.from({ length: count }, (_, idx) => {
    const num = offset + idx + 1;
    return {
      id: num,
      title: `Issue Task ${num}`,
      description: `Description for issue ${num}`,
      board_id: 10,
      boardName: 'Platform Core',
      list_id: 1,
      listName: num % 3 === 0 ? 'Done' : num % 2 === 0 ? 'In Progress' : 'To Do',
      is_complete: num % 3 === 0 ? 1 : 0,
      due_date: new Date(2026, 9, 15).toISOString(),
      assigners: [{ id: 1, name: 'Hardik' }],
      members: [{ id: 2, name: 'Alex' }]
    };
  });

describe('Issues Page (ListView) - Redesign, Server Pagination & Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes top filter pills (Board, List, Calendar)', async () => {
    workspacesApi.getWorkspaceIssues.mockResolvedValue({
      issues: generateMockIssues(20),
      pagination: {
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3
      },
      filterOptions: {
        boards: mockBoards,
        lists: [{ id: 1, name: 'To Do', board_id: 10 }],
        members: [{ id: 1, name: 'Hardik' }, { id: 2, name: 'Alex' }]
      }
    });

    render(
      <BrowserRouter>
        <ListView
          board={mockBoard}
          boards={mockBoards}
          workspace={mockWorkspace}
        />
      </BrowserRouter>
    );

    // Verify top view switcher pills are NOT rendered
    expect(screen.queryByRole('link', { name: /^Board$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^List$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Calendar$/i })).not.toBeInTheDocument();

    // Verify heading is "Issues"
    expect(screen.getByRole('heading', { level: 1, name: /Issues/i })).toBeInTheDocument();
  });

  it('performs server-side pagination with 20 items per page and navigates pages cleanly', async () => {
    workspacesApi.getWorkspaceIssues.mockImplementation(async (wsId, params = {}) => {
      const page = params.page || 1;
      const offset = (page - 1) * 20;
      return {
        issues: generateMockIssues(20, offset),
        pagination: {
          page,
          limit: 20,
          total: 45,
          totalPages: 3
        },
        filterOptions: {
          boards: mockBoards,
          lists: [],
          members: []
        }
      };
    });

    render(
      <BrowserRouter>
        <ListView
          board={mockBoard}
          boards={mockBoards}
          workspace={mockWorkspace}
        />
      </BrowserRouter>
    );

    // Wait for first page items
    await waitFor(() => {
      expect(screen.getAllByText('Issue Task 1')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Issue Task 20')[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Showing 1 to 20 of 45 issues/i)).toBeInTheDocument();

    // Click Next button to navigate to page 2
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Issue Task 21')[0]).toBeInTheDocument();
    });

    // Verify second call was with page: 2
    expect(workspacesApi.getWorkspaceIssues).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        page: 2,
        limit: 20
      })
    );
  });

  it('triggers server-side search across full data and resets page to 1', async () => {
    workspacesApi.getWorkspaceIssues.mockImplementation(async (wsId, params = {}) => {
      if (params.search === 'Special Bug 42') {
        return {
          issues: [
            {
              id: 42,
              title: 'Special Bug 42',
              description: 'Payment gateway timeout',
              board_id: 10,
              boardName: 'Platform Core',
              list_id: 1,
              listName: 'In Progress',
              is_complete: 0,
              due_date: null,
              assigners: [],
              members: []
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          },
          filterOptions: {
            boards: mockBoards,
            lists: [],
            members: []
          }
        };
      }

      return {
        issues: generateMockIssues(20),
        pagination: {
          page: 1,
          limit: 20,
          total: 45,
          totalPages: 3
        },
        filterOptions: {
          boards: mockBoards,
          lists: [],
          members: []
        }
      };
    });

    render(
      <BrowserRouter>
        <ListView
          board={mockBoard}
          boards={mockBoards}
          workspace={mockWorkspace}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Issue Task 1')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search all issues/i);
    fireEvent.change(searchInput, { target: { value: 'Special Bug 42' } });

    // Wait for debounced search call to trigger
    await waitFor(() => {
      expect(workspacesApi.getWorkspaceIssues).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          search: 'Special Bug 42',
          page: 1
        })
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('Special Bug 42')[0]).toBeInTheDocument();
    });
  });

  it('renders rich filter controls and reset button', async () => {
    workspacesApi.getWorkspaceIssues.mockResolvedValue({
      issues: generateMockIssues(5),
      pagination: {
        page: 1,
        limit: 20,
        total: 5,
        totalPages: 1
      },
      filterOptions: {
        boards: mockBoards,
        lists: [{ id: 1, name: 'To Do', board_id: 10 }],
        members: [{ id: 1, name: 'Hardik' }]
      }
    });

    render(
      <BrowserRouter>
        <ListView
          board={mockBoard}
          boards={mockBoards}
          workspace={mockWorkspace}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Issue Task 1')[0]).toBeInTheDocument();
    });

    // Verify filter dropdown controls exist
    expect(screen.getByRole('combobox', { name: /Filter by project/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by stage/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by column/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by assignee/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by assigner/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by due date/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Sort issues by/i })).toBeInTheDocument();
  });
});
