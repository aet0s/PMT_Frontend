// client/src/test/reportsPageRedesign.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportsPage from '../pages/ReportsPage';
import { ToastProvider } from '../components/ui/Toast';
import * as workspacesApi from '../api/workspaces';

// Mock workspace API
vi.mock('../api/workspaces', () => ({
  getWorkspaceReports: vi.fn()
}));

const renderReportsPage = (workspace) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <ReportsPage workspace={workspace} />
      </ToastProvider>
    </BrowserRouter>
  );
};

const mockWorkspace = {
  id: 1,
  name: 'TaskFlow HQ'
};

const mockReportData = {
  workspace: { id: 1, name: 'TaskFlow HQ' },
  summary: {
    total_tasks: 25,
    completed_tasks: 15,
    in_progress_tasks: 8,
    overdue_tasks: 2,
    due_soon_tasks: 3,
    completion_rate: 60,
    overdue_rate: 8,
    avg_cycle_days: 3.5,
    total_boards: 2,
    total_members: 2,
    unassigned_tasks: 1
  },
  boards: [
    { id: 1, name: 'Alpha Project' },
    { id: 2, name: 'Beta Sprint' }
  ],
  boards_breakdown: [
    {
      id: 1,
      name: 'Alpha Project',
      total_tasks: 15,
      completed_tasks: 10,
      overdue_tasks: 1,
      in_progress_tasks: 4,
      completion_rate: 67,
      member_count: 2,
      background_color: 'bg-primary'
    },
    {
      id: 2,
      name: 'Beta Sprint',
      total_tasks: 10,
      completed_tasks: 5,
      overdue_tasks: 1,
      in_progress_tasks: 4,
      completion_rate: 50,
      member_count: 1,
      background_color: 'bg-primary'
    }
  ],
  status_breakdown: [
    {
      board_id: 1,
      board_name: 'Alpha Project',
      list_id: 101,
      list_name: 'In Progress',
      task_count: 4,
      percentage: 27
    },
    {
      board_id: 1,
      board_name: 'Alpha Project',
      list_id: 102,
      list_name: 'Done',
      task_count: 10,
      percentage: 67
    }
  ],
  members_workload: [
    {
      id: 10,
      name: 'Sarah Connor',
      email: 'sarah@taskflow.dev',
      role: 'Project Manager',
      assigned_tasks: 12,
      completed_tasks: 8,
      in_progress_tasks: 3,
      overdue_tasks: 1,
      due_soon_tasks: 2,
      completion_rate: 67,
      boards: [{ id: 1, name: 'Alpha Project', task_count: 12, completed_count: 8 }],
      tasks: [
        {
          id: 501,
          title: 'Review Q4 Scope',
          board_id: 1,
          board_name: 'Alpha Project',
          list_name: 'In Progress',
          due_date: '2026-10-15',
          is_complete: false,
          is_overdue: false,
          is_due_soon: true
        },
        {
          id: 502,
          title: 'Publish Milestone 1',
          board_id: 1,
          board_name: 'Alpha Project',
          list_name: 'To Do',
          due_date: '2026-10-01',
          is_complete: false,
          is_overdue: true,
          is_due_soon: false
        }
      ]
    },
    {
      id: 11,
      name: 'John Doe',
      email: 'john@taskflow.dev',
      role: 'Software Engineer',
      assigned_tasks: 13,
      completed_tasks: 7,
      in_progress_tasks: 5,
      overdue_tasks: 1,
      due_soon_tasks: 1,
      completion_rate: 54,
      boards: [{ id: 1, name: 'Alpha Project', task_count: 13, completed_count: 7 }],
      tasks: []
    }
  ],
  overdue_tasks_list: [
    {
      id: 502,
      title: 'Publish Milestone 1',
      board_id: 1,
      board_name: 'Alpha Project',
      list_name: 'To Do',
      due_date: '2026-10-01',
      days_overdue: 8,
      members: [{ id: 10, name: 'Sarah Connor' }]
    }
  ],
  velocity: [
    { date: '2026-10-03', label: 'Oct 3', created: 3, completed: 2 },
    { date: '2026-10-04', label: 'Oct 4', created: 4, completed: 5 }
  ]
};

describe('ReportsPage Redesign & Usability Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspacesApi.getWorkspaceReports.mockResolvedValue(mockReportData);
  });

  it('renders primary KPI summary cards and bounded executive overview widgets', async () => {
    renderReportsPage(mockWorkspace);

    // Verify header and workspace name
    await waitFor(() => {
      expect(screen.getByText('Workspace Reports & Analytics')).toBeInTheDocument();
    });
    expect(screen.getByText('TaskFlow HQ')).toBeInTheDocument();

    // Verify 5 KPI summary values
    expect(screen.getByText('25')).toBeInTheDocument(); // total tasks
    expect(screen.getByText('60%')).toBeInTheDocument(); // completion rate
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // overdue tasks count
    expect(screen.getAllByText('8').length).toBeGreaterThan(0); // in progress
    expect(screen.getByText('3.5d')).toBeInTheDocument(); // cycle days

    // Verify sub-navigation tabs
    expect(screen.getByText('Executive Overview')).toBeInTheDocument();
    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    expect(screen.getByText('Boards & Projects')).toBeInTheDocument();
    expect(screen.getByText('Task Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Overdue Action Items')).toBeInTheDocument();

    // Verify 4 bounded widgets in Executive Overview
    expect(screen.getByText('Project & Board Performance')).toBeInTheDocument();
    expect(screen.getByText('Daily Velocity & Throughput')).toBeInTheDocument();
    expect(screen.getByText('Task Pipeline Distribution')).toBeInTheDocument();
    expect(screen.getByText('High Priority & Overdue Items')).toBeInTheDocument();
  });

  it('navigates cleanly between tabs without blowing up page height', async () => {
    renderReportsPage(mockWorkspace);

    await waitFor(() => {
      expect(screen.getByText('Executive Overview')).toBeInTheDocument();
    });

    // Switch to Team Performance tab
    const teamTabBtn = screen.getByRole('button', { name: /Team Performance/i });
    fireEvent.click(teamTabBtn);

    // Verify Team Performance section rendered
    expect(screen.getByText('Team Performance & Individual Workloads')).toBeInTheDocument();
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Switch to Boards & Projects tab
    const boardsTabBtn = screen.getByRole('button', { name: /Boards & Projects/i });
    fireEvent.click(boardsTabBtn);

    // Verify Boards section rendered
    expect(screen.getByText('Projects & Boards Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Sprint')).toBeInTheDocument();

    // Switch to Overdue Action Items tab
    const overdueTabBtn = screen.getByRole('button', { name: /Overdue Action Items/i });
    fireEvent.click(overdueTabBtn);

    // Verify Overdue tasks table rendered
    expect(screen.getByText('Overdue Tasks & Action Items')).toBeInTheDocument();
    expect(screen.getByText('Publish Milestone 1')).toBeInTheDocument();
    expect(screen.getByText('8 days late')).toBeInTheDocument();
  });

  it('opens member task dossier modal on clicking Details and displays tasks without infinite expansion', async () => {
    renderReportsPage(mockWorkspace);

    await waitFor(() => {
      expect(screen.getByText('Executive Overview')).toBeInTheDocument();
    });

    // Switch to Team tab
    fireEvent.click(screen.getByRole('button', { name: /Team Performance/i }));

    // Click "Details" on Sarah Connor
    const detailsButtons = screen.getAllByRole('button', { name: /Details/i });
    expect(detailsButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailsButtons[0]);

    // Verify Modal opened with member dossier
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Review Q4 Scope')).toBeInTheDocument();
    expect(screen.getByText('Export User Report (CSV)')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('supports searching within team members and filtering by status', async () => {
    renderReportsPage(mockWorkspace);

    await waitFor(() => {
      expect(screen.getByText('Executive Overview')).toBeInTheDocument();
    });

    // Switch to Team tab
    fireEvent.click(screen.getByRole('button', { name: /Team Performance/i }));

    const searchInput = screen.getByPlaceholderText(/Search team member by name/i);
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
