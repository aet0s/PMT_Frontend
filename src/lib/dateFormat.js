import { format, formatDistanceToNow, isValid } from 'date-fns';
import {
  setServerTimeSync,
  getCurrentServerDate,
  getServerNow,
  useServerNow,
  syncServerTime
} from './serverTime';

export { getServerNow, useServerNow, syncServerTime };

export function updateServerTime(serverDateOrMs) {
  if (!serverDateOrMs) return;
  setServerTimeSync(serverDateOrMs);
}


/**
 * Parse date safely handling MySQL string dates ('YYYY-MM-DD HH:MM:SS'), ISO strings, and timestamps
 */
export function parseSafeDate(date) {
  if (!date) return null;
  if (date instanceof Date) return isValid(date) ? date : null;
  if (typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  if (typeof date === 'string') {
    const s = date.trim();
    if (!s) return null;
    // Pure date: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // Handle MySQL datetime ('YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DDTHH:mm:ss') or ISO strings
    let clean = s;
    if (!clean.endsWith('Z') && !clean.includes('+')) {
      // Database session runs in Asia/Kolkata (+05:30), so non-annotated timestamps are IST
      clean = clean.replace(' ', 'T') + '+05:30';
    }
    const d = new Date(clean);
    return isValid(d) ? d : null;
  }
  return null;
}

/**
 * Format any date object or ISO string to strict app standard: DD/MM/YYYY hh:mm A
 * Converted to Indian Standard Time (IST, Asia/Kolkata).
 * Example: 05/11/2026 12:57 PM
 */
export function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    const s = date.trim();
    // For pure date YYYY-MM-DD without time, preserve day/month/year directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  const d = parseSafeDate(date);
  if (!d) return '';
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(d);
    const m = {};
    parts.forEach((p) => { m[p.type] = p.value; });
    const period = (m.dayPeriod || '').toUpperCase();
    return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute} ${period}`.trim();
  } catch {
    return format(d, 'dd/MM/yyyy hh:mm a');
  }
}

/**
 * Compact date for card badges: "11 Aug" or "11 Aug 25" if not current year in IST
 */
export function formatShortDate(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  try {
    const currentYear = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(getServerNow());
    const targetYear = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(d);
    const isCurrentYear = currentYear === targetYear;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      ...(isCurrentYear ? {} : { year: '2-digit' })
    }).format(d);
  } catch {
    const isCurrentYear = d.getFullYear() === getServerNow().getFullYear();
    return format(d, isCurrentYear ? 'd MMM' : 'd MMM yy');
  }
}

/**
 * Format date for input datetime-local fields: YYYY-MM-DDTHH:mm in IST
 */
export function formatDateForInput(date) {
  const d = parseSafeDate(date);
  if (!d) return '';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(d).replace(', ', 'T');
  } catch {
    return format(d, "yyyy-MM-dd'T'HH:mm");
  }
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
