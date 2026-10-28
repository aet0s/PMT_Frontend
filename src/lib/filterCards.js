/**
 * Filter card logic for board search and filtering
 */
import { isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { parseSafeDate, getServerNow } from './dateFormat';

export function matchesCardFilter(card, {
  searchQuery = '',
  filterMemberId = null,
  filterAssigneeId = null,
  filterAssignerId = null,
  filterLabelId = null,
  filterDueDate = 'all',
  filterListId = null,
  filterStatus = 'all',
  currentUserId = null
} = {}) {
  // Search query filter (title or description)
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const matchTitle = (card.title || '').toLowerCase().includes(q);
    const matchDesc = (card.description || '').toLowerCase().includes(q);
    if (!matchTitle && !matchDesc) return false;
  }

  // Assignee / Member filter
  const memberFilter = filterMemberId ?? filterAssigneeId;
  if (memberFilter && memberFilter !== 'all') {
    if (memberFilter === 'unassigned') {
      if (card.members && card.members.length > 0) return false;
    } else if (memberFilter === 'me' && currentUserId) {
      const isMe = (card.members || []).some(
        (m) => Number(m.id || m.user_id) === Number(currentUserId)
      );
      if (!isMe) return false;
    } else {
      const isMember = (card.members || []).some(
        (m) =>
          Number(m.id || m.user_id) === Number(memberFilter)
      );
      if (!isMember) return false;
    }
  }

  // Assigner / Creator filter
  if (filterAssignerId && filterAssignerId !== 'all') {
    const isAssigner =
      (card.assigners || []).some(
        (a) => Number(a.id || a.user_id) === Number(filterAssignerId)
      ) || Number(card.creator_id) === Number(filterAssignerId);
    if (!isAssigner) return false;
  }

  // Label filter
  if (filterLabelId && filterLabelId !== 'all') {
    if (filterLabelId === 'no-label') {
      if (card.labels && card.labels.length > 0) return false;
    } else {
      const hasLabel = (card.labels || []).some(
        (l) => Number(l.id || l.label_id) === Number(filterLabelId)
      );
      if (!hasLabel) return false;
    }
  }

  // List filter
  if (filterListId && filterListId !== 'all') {
    if (Number(card.list_id) !== Number(filterListId)) return false;
  }

  // Due Date filter
  if (filterDueDate && filterDueDate !== 'all') {
    if (filterDueDate === 'no-date') {
      if (card.due_date) return false;
    } else if (filterDueDate === 'has-date') {
      if (!card.due_date) return false;
    } else {
      if (!card.due_date) return false;
      const due = parseSafeDate(card.due_date);
      if (!due) return false;
      const now = getServerNow();

      if (filterDueDate === 'overdue' && (due >= now || card.is_complete)) return false;
      if (filterDueDate === 'soon') {
        const in24h = due - now <= 24 * 60 * 60 * 1000 && due >= now;
        if (!in24h || card.is_complete) return false;
      }
      if (filterDueDate === 'today' && !isSameDay(due, now)) return false;
      if (filterDueDate === 'tomorrow' && !isSameDay(due, addDays(now, 1))) return false;
      if (filterDueDate === 'this-week') {
        const start = startOfWeek(now, { weekStartsOn: 0 });
        const end = endOfWeek(now, { weekStartsOn: 0 });
        if (due < start || due > end) return false;
      }
    }
  }

  // Status filter
  if (filterStatus && filterStatus !== 'all') {
    const isDone = Boolean(card.is_complete || card.stage === 'done' || card.stage === 'completed');
    if (filterStatus === 'incomplete' && isDone) return false;
    if (filterStatus === 'completed' && !isDone) return false;
  }

  return true;
}

export function filterBoardCards(lists = [], filters = {}) {
  return lists.map((l) => ({
    ...l,
    cards: (l.cards || []).filter((card) => matchesCardFilter(card, filters))
  }));
}

