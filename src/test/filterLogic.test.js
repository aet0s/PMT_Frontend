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
});
