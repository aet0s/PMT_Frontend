import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RightContextPanel from '../components/Board/RightContextPanel';

// Mock SocketProvider so NotificationBell renders without issues
vi.mock('../context/SocketProvider', () => ({
  useSocket: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  })
}));

describe('RightContextPanel Calendar & Upcoming Tasks', () => {
  const mockUser = { id: 1, name: 'Alice Smith' };
  const mockBoard = {
    id: 10,
    name: 'Sprint Planning',
    lists: [
      { id: 101, name: 'To Do' },
      { id: 102, name: 'In Progress' },
      { id: 103, name: 'Done' }
    ]
  };

  const mockCards = [
    {
      id: 1,
      title: 'Design Landing Page Header',
      description: 'Create responsive hero component',
      list_id: 101,
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days future
      is_complete: false
    },
    {
      id: 2,
      title: 'Fix Database Connection Leak',
      description: 'Audit pool connections',
      list_id: 102,
      due_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days past (overdue)
      is_complete: false
    },
    {
      id: 3,
      title: 'Implement OAuth Login',
      description: 'Google and GitHub SSO',
      list_id: 103,
      due_date: new Date(Date.now() - 86400000 * 5).toISOString(),
      is_complete: true
    }
  ];

  it('renders user greeting, calendar, and upcoming tasks header', () => {
    render(
      <RightContextPanel
        user={mockUser}
        board={mockBoard}
        cards={mockCards}
      />
    );

    expect(screen.getByText(/Hi, Alice!/i)).toBeInTheDocument();
    expect(screen.getByText('Upcoming Task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View all 3 tasks/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('opens month and year picker dropdown and allows selecting month and year using designed Select dropdown', async () => {
    const user = userEvent.setup();
    render(
      <RightContextPanel
        user={mockUser}
        board={mockBoard}
        cards={mockCards}
      />
    );

    // Initial month button
    const monthTrigger = screen.getByRole('button', { name: /Select month and year/i });
    expect(monthTrigger).toBeInTheDocument();

    // Click to open month/year picker
    await user.click(monthTrigger);

    // Dialog / popover should appear
    expect(screen.getByRole('dialog', { name: /Month and year picker/i })).toBeInTheDocument();

    // The designed Select dropdown should be rendered for the Year
    const yearCombobox = screen.getByRole('combobox', { name: /Select year/i });
    expect(yearCombobox).toBeInTheDocument();
    await user.click(yearCombobox);

    // Select '2028' from the floating listbox
    const option2028 = screen.getByText('2028');
    await user.click(option2028);

    // Click December
    const decButton = screen.getByRole('button', { name: 'Dec' });
    await user.click(decButton);

    // The header should now reflect December 2028
    expect(screen.getByText(/December 2028/i)).toBeInTheDocument();
  });

  it('opens All Tasks modal when View All button is clicked and maintains stable window size on empty filter', () => {
    const handleCardClick = vi.fn();

    render(
      <RightContextPanel
        user={mockUser}
        board={mockBoard}
        cards={mockCards}
        onCardClick={handleCardClick}
      />
    );

    const viewAllBtn = screen.getByRole('button', { name: /View all 3 tasks/i });
    fireEvent.click(viewAllBtn);

    // Modal title should be visible
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Board Tasks & Deadlines')).toBeInTheDocument();
    expect(within(modal).getByText(/Viewing all tasks across lists for Sprint Planning/i)).toBeInTheDocument();

    // All 3 tasks should be listed in the modal
    expect(within(modal).getByText('Design Landing Page Header')).toBeInTheDocument();
    expect(within(modal).getByText('Fix Database Connection Leak')).toBeInTheDocument();
    expect(within(modal).getByText('Implement OAuth Login')).toBeInTheDocument();

    // Test filter pills: Overdue
    const overdueFilterBtn = within(modal).getByRole('button', { name: /Overdue \(1\)/i });
    fireEvent.click(overdueFilterBtn);

    expect(within(modal).getByText('Fix Database Connection Leak')).toBeInTheDocument();
    expect(within(modal).queryByText('Design Landing Page Header')).not.toBeInTheDocument();

    // Test clicking a task opens it and closes modal
    fireEvent.click(within(modal).getByText('Fix Database Connection Leak'));
    expect(handleCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('allows multi-character typing in search bar without losing focus and filters properly', async () => {
    const user = userEvent.setup();
    render(
      <RightContextPanel
        user={mockUser}
        board={mockBoard}
        cards={mockCards}
      />
    );

    await user.click(screen.getByRole('button', { name: /View all 3 tasks/i }));

    const modal = screen.getByRole('dialog');
    const searchInput = within(modal).getByPlaceholderText(/Filter tasks by title or description/i);

    // Type full string character by character (verifies search does not lose focus after 1st character)
    await user.type(searchInput, 'Landing Page');
    expect(searchInput).toHaveValue('Landing Page');
    expect(document.activeElement).toBe(searchInput);

    expect(within(modal).getByText('Design Landing Page Header')).toBeInTheDocument();
    expect(within(modal).queryByText('Fix Database Connection Leak')).not.toBeInTheDocument();
    expect(within(modal).queryByText('Implement OAuth Login')).not.toBeInTheDocument();

    // Empty search result maintains stable layout
    await user.clear(searchInput);
    await user.type(searchInput, 'NonExistentXYZ');
    expect(within(modal).getByText('No tasks found')).toBeInTheDocument();
    expect(within(modal).getByText(/No tasks matched "NonExistentXYZ"/i)).toBeInTheDocument();
  });

  it('filters tasks by selected future date when clicking View tasks button under calendar and allows clearing date filter', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(Date.now() + 86400000 * 2);
    const futureDateStr = futureDate.toISOString();

    const testCards = [
      {
        id: 10,
        title: 'Future Milestone Alpha',
        description: 'Prepare sprint delivery',
        list_id: 101,
        due_date: futureDateStr,
        is_complete: false
      },
      {
        id: 20,
        title: 'Past Unrelated Task',
        description: 'Already due yesterday',
        list_id: 102,
        due_date: new Date(Date.now() - 86400000).toISOString(),
        is_complete: false
      }
    ];

    render(
      <RightContextPanel
        user={mockUser}
        board={mockBoard}
        cards={testCards}
      />
    );

    // Find and click the future date button on the calendar
    const futureDayBtn = screen.getByRole('button', {
      name: new RegExp(futureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 'i')
    });
    expect(futureDayBtn).toBeInTheDocument();
    await user.click(futureDayBtn);

    // Check that the selected date button has the smooth ring/select animation class
    expect(futureDayBtn.className).toContain('animate-calendar-date-select');
    expect(futureDayBtn.className).toContain('ring-2');

    // Quick action bar under calendar should show the due task and View tasks button
    const viewTasksBtn = screen.getByRole('button', { name: /View tasks/i });
    expect(viewTasksBtn).toBeInTheDocument();
    await user.click(viewTasksBtn);

    // Modal should now be open
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // The modal should display the date filter chip
    expect(within(modal).getByRole('button', { name: /Clear date filter/i })).toBeInTheDocument();

    // Only Future Milestone Alpha should be visible; Past Unrelated Task should be filtered out
    expect(within(modal).getByText('Future Milestone Alpha')).toBeInTheDocument();
    expect(within(modal).queryByText('Past Unrelated Task')).not.toBeInTheDocument();

    // Click the clear date filter button
    const clearDateBtn = within(modal).getByRole('button', { name: /Clear date filter/i });
    await user.click(clearDateBtn);

    // Now both tasks should be visible
    expect(within(modal).getByText('Future Milestone Alpha')).toBeInTheDocument();
    expect(within(modal).getByText('Past Unrelated Task')).toBeInTheDocument();
  });
});

