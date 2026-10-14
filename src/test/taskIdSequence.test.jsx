import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../components/Board/Card';
import CardHeader from '../components/Card/CardHeader';
import List from '../components/Board/List';
import { PermissionProvider } from '../context/PermissionContext';

// Mock dnd-kit hooks for List and Card
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }),
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: {}
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null
    }
  }
}));

describe('Verify Task ID Sequence When Creating Tasks', () => {
  it('displays Task #1 for the first task even when database AUTO_INCREMENT id is 7', () => {
    const cardWithDbId7 = {
      id: 7,
      title: 'First task in active sprint',
      task_number: 1,
      labels: [],
      assigners: [],
      members: [],
      checklists: [],
      comments: [],
      attachments: []
    };

    render(
      <PermissionProvider>
        <Card card={cardWithDbId7} taskNumber={1} />
      </PermissionProvider>
    );

    // Expected: Displays "Task #1"
    expect(screen.getByText('Task #1')).toBeInTheDocument();
    // Must NOT display "Task #7"
    expect(screen.queryByText('Task #7')).not.toBeInTheDocument();
  });

  it('displays sequential Task #1, Task #2, Task #3 for tasks created in an active sprint', () => {
    const cards = [
      { id: 7, title: 'Task Alpha', task_number: 1, created_at: '2026-10-09T08:00:00Z' },
      { id: 14, title: 'Task Beta', task_number: 2, created_at: '2026-10-09T08:05:00Z' },
      { id: 25, title: 'Task Gamma', task_number: 3, created_at: '2026-10-09T08:10:00Z' }
    ];

    const taskNumberMap = new Map([
      [7, 1],
      [14, 2],
      [25, 3]
    ]);

    const { rerender } = render(
      <PermissionProvider>
        <List
          list={{ id: 1, name: 'To Do' }}
          cards={cards}
          taskNumberMap={taskNumberMap}
        />
      </PermissionProvider>
    );

    expect(screen.getByText('Task #1')).toBeInTheDocument();
    expect(screen.getByText('Task #2')).toBeInTheDocument();
    expect(screen.getByText('Task #3')).toBeInTheDocument();

    // Verify raw DB IDs 7, 14, 25 are not displayed in the Task # tags
    expect(screen.queryByText('Task #7')).not.toBeInTheDocument();
    expect(screen.queryByText('Task #14')).not.toBeInTheDocument();
    expect(screen.queryByText('Task #25')).not.toBeInTheDocument();
  });

  it('preserves Task #1 identity when a task is moved to another list column', () => {
    const taskNumberMap = new Map([[7, 1]]);

    const card = {
      id: 7,
      title: 'First sprint task moved to In Progress',
      task_number: 1,
      list_id: 2
    };

    render(
      <PermissionProvider>
        <List
          list={{ id: 2, name: 'In Progress' }}
          cards={[card]}
          taskNumberMap={taskNumberMap}
        />
      </PermissionProvider>
    );

    expect(screen.getByText('Task #1')).toBeInTheDocument();
    expect(screen.queryByText('Task #7')).not.toBeInTheDocument();
  });

  it('defaults to Task #1 when taskNumber or task_number is not explicitly provided, never leaking DB ID', () => {
    const rawCard = {
      id: 99,
      title: 'Unsequenced raw DB card'
    };

    render(
      <PermissionProvider>
        <Card card={rawCard} />
      </PermissionProvider>
    );

    expect(screen.getByText('Task #1')).toBeInTheDocument();
    expect(screen.queryByText('Task #99')).not.toBeInTheDocument();
  });

  it('renders Task #1 in CardHeader modal header view', () => {
    const card = {
      id: 7,
      title: 'Modal Header Task',
      task_number: 1,
      list_id: 1
    };

    const boardLists = [{ id: 1, name: 'To Do' }];

    render(
      <PermissionProvider>
        <CardHeader
          card={card}
          boardLists={boardLists}
          onMoveList={vi.fn()}
          onArchiveCard={vi.fn()}
          onCopyCard={vi.fn()}
          onDeleteCard={vi.fn()}
          onClose={vi.fn()}
        />
      </PermissionProvider>
    );

    expect(screen.getByText('Task #1')).toBeInTheDocument();
    expect(screen.queryByText('Task #7')).not.toBeInTheDocument();
  });
});
