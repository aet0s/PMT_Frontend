/**
 * Filter card logic for board search and filtering
 * @param {Object} card 
 * @param {Object} filters { searchQuery, filterMemberId, filterLabelId, filterDueDate }
 * @returns {boolean}
 */
export function matchesCardFilter(card, {
  searchQuery = '',
  filterMemberId = null,
  filterLabelId = null,
  filterDueDate = 'all'
} = {}) {
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const matchTitle = (card.title || '').toLowerCase().includes(q);
    const matchDesc = (card.description || '').toLowerCase().includes(q);
    if (!matchTitle && !matchDesc) return false;
  }

  if (filterMemberId) {
    const isMember = (card.members || []).some((m) => m.id === filterMemberId);
    if (!isMember) return false;
  }

  if (filterLabelId) {
    const hasLabel = (card.labels || []).some((l) => l.id === filterLabelId);
    if (!hasLabel) return false;
  }

  if (filterDueDate && filterDueDate !== 'all') {
    if (!card.due_date) return false;
    const due = new Date(card.due_date);
    const now = new Date();
    if (filterDueDate === 'overdue' && (due >= now || card.is_complete)) return false;
    if (filterDueDate === 'soon') {
      const in24h = due - now <= 24 * 60 * 60 * 1000 && due >= now;
      if (!in24h || card.is_complete) return false;
    }
  }

  return true;
}

export function filterBoardCards(lists = [], filters = {}) {
  return lists.map((l) => ({
    ...l,
    cards: (l.cards || []).filter((card) => matchesCardFilter(card, filters))
  }));
}
