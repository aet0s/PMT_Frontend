/**
 * Filter card logic for board search and filtering
 */
import { parseSafeDate } from './dateFormat';

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
    const isMember = (card.members || []).some(
      (m) =>
        m.id === filterMemberId ||
        m.user_id === filterMemberId ||
        Number(m.id) === Number(filterMemberId) ||
        Number(m.user_id) === Number(filterMemberId)
    );
    if (!isMember) return false;
  }

  if (filterLabelId) {
    const hasLabel = (card.labels || []).some(
      (l) =>
        l.id === filterLabelId ||
        l.label_id === filterLabelId ||
        Number(l.id) === Number(filterLabelId) ||
        Number(l.label_id) === Number(filterLabelId)
    );
    if (!hasLabel) return false;
  }

  if (filterDueDate && filterDueDate !== 'all') {
    if (!card.due_date) return false;
    const due = parseSafeDate(card.due_date);
    if (!due) return false;
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
