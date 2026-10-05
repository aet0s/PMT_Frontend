import { format, formatDistanceToNow, isValid } from 'date-fns';

/**
 * Parse date safely handling MySQL string dates ('YYYY-MM-DD HH:MM:SS') and timezone offsets
 */
export function parseSafeDate(date) {
  if (!date) return null;
  if (date instanceof Date) return isValid(date) ? date : null;
  if (typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  if (typeof date === 'string') {
    let s = date.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T') + (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s) ? '' : 'Z');
    }
    const d = new Date(s);
    return isValid(d) ? d : null;
  }
  return null;
}

/**
 * Format any date object or ISO string to strict app standard: DD/MM/YYYY hh:mm A
 * Example: 12/08/2026 02:41 PM
 */
export function formatDate(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  return format(d, 'dd/MM/yyyy hh:mm a');
}

/**
 * Compact date for card badges: "11 Aug" or "11 Aug 25" if not current year
 */
export function formatShortDate(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  const isCurrentYear = d.getFullYear() === new Date().getFullYear();
  return format(d, isCurrentYear ? 'd MMM' : 'd MMM yy');
}

/**
 * Format date for input datetime-local fields: YYYY-MM-DDTHH:mm
 */
export function formatDateForInput(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format relative timestamp for activity/comment feeds (e.g. "52 minutes ago")
 */
export function formatRelativeTime(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Validate DD/MM/YYYY string manual entry
 */
export function parseDDMMYYYY(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) return null;

  const d = new Date(year, month, day);
  if (!isValid(d) || d.getDate() !== day) return null;
  return d;
}
