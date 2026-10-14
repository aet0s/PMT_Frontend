// client/src/test/workspaceHomePageRedesign.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceHomePage from '../pages/WorkspaceHomePage';

const mockWorkspace = {
  id: 1,
  name: 'TaskFlow Tech'
};

const mockUser = {
  id: 1,
  name: 'Hardik'
};

// Generate 14 sample boards to verify pagination and density
const mockBoards = Array.from({ length: 14 }, (_, idx) => ({
  id: idx + 1,
  name: `Project Board ${idx + 1}`,
  card_count: idx % 2 === 0 ? idx * 3 : 0,
  list_count: 3,
  member_count: 2,
  created_at: new Date(2026, 9, idx + 1).toISOString(),
  background_color: 'bg-primary'
}));

describe('WorkspaceHomePage Dashboard Redesign & Pagination Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders dashboard with project metrics, search, sort, and pagination', () => {
    render(
      <BrowserRouter>
        <WorkspaceHomePage
          workspace={mockWorkspace}
          boards={mockBoards}
          user={mockUser}
        />
      </BrowserRouter>
    );

    // Verify header and project count
    expect(screen.getByText(/TaskFlow Tech/i)).toBeInTheDocument();
    expect(screen.getByText(/14 of 14/i)).toBeInTheDocument();

    // Verify first page items in grid view (6 items per page)
    expect(screen.getByText('Project Board 14')).toBeInTheDocument();
    expect(screen.getByText('Project Board 13')).toBeInTheDocument();
    expect(screen.queryByText('Project Board 1')).not.toBeInTheDocument(); // On later page

    // Verify pagination controls are present
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Showing 1 to 6 of 14 projects/i)).toBeInTheDocument();
  });

  it('navigates to next page cleanly', () => {
    render(
      <BrowserRouter>
        <WorkspaceHomePage
          workspace={mockWorkspace}
          boards={mockBoards}
          user={mockUser}
        />
      </BrowserRouter>
    );

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    // Page 2 shows next 6 items (index 6 to 11)
    expect(screen.getByLabelText(/Showing 7 to 12 of 14 projects/i)).toBeInTheDocument();
  });

  it('toggles between Grid View and Compact Table View', () => {
    render(
      <BrowserRouter>
        <WorkspaceHomePage
          workspace={mockWorkspace}
          boards={mockBoards}
          user={mockUser}
        />
      </BrowserRouter>
    );

    // Switch to compact list view
    const listToggleBtn = screen.getByRole('button', { name: /Compact Table View/i });
    fireEvent.click(listToggleBtn);

    // Table header should be rendered
    expect(screen.getByRole('columnheader', { name: /Project Board/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Project Progress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Showing 1 to 10 of 14 projects/i)).toBeInTheDocument(); // 10 per page in list view

    // Switch back to grid view
    const gridToggleBtn = screen.getByRole('button', { name: /Grid Card View/i });
    fireEvent.click(gridToggleBtn);

    expect(screen.getByLabelText(/Showing 1 to 6 of 14 projects/i)).toBeInTheDocument();
  });

  it('allows pinning a project board as default and filtering by pinned', () => {
    render(
      <BrowserRouter>
        <WorkspaceHomePage
          workspace={mockWorkspace}
          boards={mockBoards}
          user={mockUser}
        />
      </BrowserRouter>
    );

    // Find star button for Project Board 14 (on page 1)
    const pinBtn = screen.getByRole('button', { name: /Pin Project Board 14 as default/i });
    expect(pinBtn).toBeInTheDocument();

    // Click pin button
    fireEvent.click(pinBtn);

    // Expect badge "★ Pinned Project" to appear
    expect(screen.getByText(/★ Pinned Project/i)).toBeInTheDocument();

    // The filter pill "Pinned (1)" should now be visible
    const pinnedFilterBtn = screen.getByRole('button', { name: /Pinned \(1\)/i });
    expect(pinnedFilterBtn).toBeInTheDocument();

    // Clicking pinned filter should display only the pinned board
    fireEvent.click(pinnedFilterBtn);
    expect(screen.getByText('Project Board 14')).toBeInTheDocument();
    expect(screen.queryByText('Project Board 13')).not.toBeInTheDocument();

    // Unpin Project Board 14
    const unpinBtn = screen.getByRole('button', { name: /Unpin Project Board 14/i });
    fireEvent.click(unpinBtn);

    expect(screen.queryByText(/★ Pinned Project/i)).not.toBeInTheDocument();
  });

  it('filters boards by search query and status pills', () => {
    render(
      <BrowserRouter>
        <WorkspaceHomePage
          workspace={mockWorkspace}
          boards={mockBoards}
          user={mockUser}
        />
      </BrowserRouter>
    );

    // Search query
    const searchInput = screen.getByPlaceholderText(/Search projects/i);
    fireEvent.change(searchInput, { target: { value: 'Board 10' } });

    expect(screen.getByText('Project Board 10')).toBeInTheDocument();
    expect(screen.queryByText('Project Board 14')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by Empty Boards
    const emptyFilterBtn = screen.getByRole('button', { name: /Empty Boards/i });
    fireEvent.click(emptyFilterBtn);

    // Only empty boards displayed
    expect(screen.getByText(/of 14/i)).toBeInTheDocument();
  });
});
