import { describe, it, expect } from 'vitest';
import { matchesCardFilter, filterBoardCards } from '../lib/filterCards';

describe('Board filter and search logic', () => {
  const sampleCard = {
    id: 1,
    title: 'Fix authentication bug',
    description: 'Investigate token expiration and refresh',
    members: [{ id: 101, name: 'Alice' }],
    labels: [{ id: 201, name: 'Bug', color: 'red' }],
    due_date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // due in 12h
    is_complete: false
  };

  it('matches keyword search on title (case-insensitive)', () => {
    expect(matchesCardFilter(sampleCard, { searchQuery: 'AUTHENTICATION' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { searchQuery: 'fix' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { searchQuery: 'nonexistent' })).toBe(false);
  });

  it('matches keyword search on description', () => {
    expect(matchesCardFilter(sampleCard, { searchQuery: 'refresh' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { searchQuery: 'token' })).toBe(true);
  });

  it('filters by member ID', () => {
    expect(matchesCardFilter(sampleCard, { filterMemberId: 101 })).toBe(true);
    expect(matchesCardFilter(sampleCard, { filterMemberId: 999 })).toBe(false);
  });

  it('filters by label ID', () => {
    expect(matchesCardFilter(sampleCard, { filterLabelId: 201 })).toBe(true);
    expect(matchesCardFilter(sampleCard, { filterLabelId: 999 })).toBe(false);
  });

  it('filters by due date "soon" (due in <= 24 hours)', () => {
    expect(matchesCardFilter(sampleCard, { filterDueDate: 'soon' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { filterDueDate: 'overdue' })).toBe(false);
  });

  it('filters by due date "overdue"', () => {
    const overdueCard = {
      ...sampleCard,
      due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    };
    expect(matchesCardFilter(overdueCard, { filterDueDate: 'overdue' })).toBe(true);
    expect(matchesCardFilter(overdueCard, { filterDueDate: 'soon' })).toBe(false);
  });

  it('excludes completed cards from overdue and soon filters', () => {
    const completedOverdueCard = {
      ...sampleCard,
      due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_complete: true
    };
    expect(matchesCardFilter(completedOverdueCard, { filterDueDate: 'overdue' })).toBe(false);
    expect(matchesCardFilter(completedOverdueCard, { filterDueDate: 'all' })).toBe(true);
  });

  it('correctly filters cards in a list of board lists', () => {
    const lists = [
      {
        id: 1,
        name: 'To Do',
        cards: [
          sampleCard,
          { id: 2, title: 'Write documentation', description: '', members: [], labels: [] }
        ]
      }
    ];

    const filtered = filterBoardCards(lists, { searchQuery: 'authentication' });
    expect(filtered[0].cards).toHaveLength(1);
    expect(filtered[0].cards[0].id).toBe(1);
  });

  it('filters by list ID', () => {
    const cardInList1 = { ...sampleCard, list_id: 10 };
    const cardInList2 = { ...sampleCard, list_id: 20 };
    expect(matchesCardFilter(cardInList1, { filterListId: 10 })).toBe(true);
    expect(matchesCardFilter(cardInList2, { filterListId: 10 })).toBe(false);
  });

  it('filters by assigner ID', () => {
    const cardWithAssigner = {
      ...sampleCard,
      assigners: [{ id: 501, name: 'Lead Dev' }]
    };
    expect(matchesCardFilter(cardWithAssigner, { filterAssignerId: 501 })).toBe(true);
    expect(matchesCardFilter(cardWithAssigner, { filterAssignerId: 999 })).toBe(false);
  });

  it('filters by unassigned and assigned to me', () => {
    const unassignedCard = { ...sampleCard, members: [] };
    const assignedCard = { ...sampleCard, members: [{ id: 77, name: 'Myself' }] };

    expect(matchesCardFilter(unassignedCard, { filterAssigneeId: 'unassigned' })).toBe(true);
    expect(matchesCardFilter(assignedCard, { filterAssigneeId: 'unassigned' })).toBe(false);

    expect(matchesCardFilter(assignedCard, { filterAssigneeId: 'me', currentUserId: 77 })).toBe(true);
    expect(matchesCardFilter(assignedCard, { filterAssigneeId: 'me', currentUserId: 88 })).toBe(false);
  });

  it('filters by no-label and no-date', () => {
    const noLabelCard = { ...sampleCard, labels: [] };
    const noDateCard = { ...sampleCard, due_date: null };

    expect(matchesCardFilter(noLabelCard, { filterLabelId: 'no-label' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { filterLabelId: 'no-label' })).toBe(false);

    expect(matchesCardFilter(noDateCard, { filterDueDate: 'no-date' })).toBe(true);
    expect(matchesCardFilter(sampleCard, { filterDueDate: 'no-date' })).toBe(false);
    expect(matchesCardFilter(sampleCard, { filterDueDate: 'has-date' })).toBe(true);
  });

  it('filters by status (incomplete vs completed)', () => {
    const completedCard = { ...sampleCard, is_complete: true };
    const incompleteCard = { ...sampleCard, is_complete: false };

    expect(matchesCardFilter(completedCard, { filterStatus: 'completed' })).toBe(true);
    expect(matchesCardFilter(completedCard, { filterStatus: 'incomplete' })).toBe(false);

    expect(matchesCardFilter(incompleteCard, { filterStatus: 'incomplete' })).toBe(true);
    expect(matchesCardFilter(incompleteCard, { filterStatus: 'completed' })).toBe(false);
  });
});

