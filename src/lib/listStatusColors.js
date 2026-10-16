/**
 * Utility functions and mappings for 4 predefined/default board list statuses
 * (To Do, In Progress, Review, Done).
 *
 * Provides soft curved bottom border accents and status colors matching list types.
 * Applies strictly to default lists and cards within default lists.
 */

export const DEFAULT_LIST_STATUS_KEYS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done'
};

export const DEFAULT_LIST_STATUS_CONFIG = {
  todo: {
    key: 'todo',
    label: 'To Do',
    cssVar: 'var(--color-status-todo)',
    cardClass: 'card-status-todo',
    headerClass: 'list-status-todo'
  },
  in_progress: {
    key: 'in_progress',
    label: 'In Progress',
    cssVar: 'var(--color-status-in-progress)',
    cardClass: 'card-status-in-progress',
    headerClass: 'list-status-in-progress'
  },
  review: {
    key: 'review',
    label: 'Review',
    cssVar: 'var(--color-status-review)',
    cardClass: 'card-status-review',
    headerClass: 'list-status-review'
  },
  done: {
    key: 'done',
    label: 'Done',
    cssVar: 'var(--color-status-done)',
    cardClass: 'card-status-done',
    headerClass: 'list-status-done'
  }
};

/**
 * Normalizes list name and checks if it matches one of the 4 default lists.
 * Returns 'todo' | 'in_progress' | 'review' | 'done' | null.
 *
 * @param {string|null|undefined} listName
 * @returns {'todo'|'in_progress'|'review'|'done'|null}
 */
export function getDefaultListStatus(listName) {
  if (!listName || typeof listName !== 'string') return null;
  const name = listName.trim().toLowerCase();

  // 1. To Do
  if (name === 'to do' || name === 'todo' || name === 'to-do' || name === 'backlog') {
    return 'todo';
  }

  // 2. In Progress
  if (name === 'in progress' || name === 'in-progress' || name === 'doing' || name === 'wip') {
    return 'in_progress';
  }

  // 3. Review
  if (name === 'review' || name === 'in review' || name === 'in-review' || name === 'qa') {
    return 'review';
  }

  // 4. Done
  if (name === 'done' || name === 'completed' || name === 'finished') {
    return 'done';
  }

  return null;
}

/**
 * Derives default status for a card using listName or internal card fields.
 *
 * @param {object|null|undefined} card
 * @param {string|null|undefined} listName
 * @returns {'todo'|'in_progress'|'review'|'done'|null}
 */
export function getCardDefaultStatus(card, listName) {
  const directName = listName || card?.list_name || card?.list?.name;
  if (directName) {
    const status = getDefaultListStatus(directName);
    if (status) return status;
  }

  if (card?.stage && typeof card.stage === 'string') {
    const stage = card.stage.toLowerCase().trim();
    if (DEFAULT_LIST_STATUS_CONFIG[stage]) {
      return stage;
    }
  }

  return null;
}

/**
 * Returns configuration object for a default list status or name, or null if custom.
 *
 * @param {string|null|undefined} statusOrName
 * @returns {typeof DEFAULT_LIST_STATUS_CONFIG[key]|null}
 */
export function getListStatusConfig(statusOrName) {
  if (!statusOrName || typeof statusOrName !== 'string') return null;

  if (DEFAULT_LIST_STATUS_CONFIG[statusOrName]) {
    return DEFAULT_LIST_STATUS_CONFIG[statusOrName];
  }

  const detected = getDefaultListStatus(statusOrName);
  return detected ? DEFAULT_LIST_STATUS_CONFIG[detected] : null;
}
