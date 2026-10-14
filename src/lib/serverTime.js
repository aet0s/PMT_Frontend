// client/src/lib/serverTime.js

/**
 * Returns the hour in India Standard Time (IST, UTC+5:30) for the given Date object.
 * Guaranteed to return an integer between 0 and 23 in Asia/Kolkata timezone.
 *
 * @param {Date} [date=new Date()]
 * @returns {number} Hour in IST (0 - 23)
 */
export function getISTHour(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    });
    const formatted = formatter.format(date);
    const hour = parseInt(formatted, 10);
    return hour === 24 ? 0 : hour;
  } catch {
    // Fallback: manually calculate UTC + 5.5 hours
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 5.5 * 3600000);
    return istTime.getHours();
  }
}

/**
 * Returns the appropriate time-based greeting in Title Case based on IST (Asia/Kolkata):
 * - Morning (00:00 - 11:59 IST): "Good Morning"
 * - Afternoon (12:00 - 16:59 IST): "Good Afternoon"
 * - Evening (17:00 - 23:59 IST): "Good Evening"
 *
 * @param {Date} [date=new Date()]
 * @returns {"Good Morning" | "Good Afternoon" | "Good Evening"}
 */
export function getTimeBasedGreeting(date = new Date()) {
  const hour = getISTHour(date);
  if (hour < 12) {
    return 'Good Morning';
  }
  if (hour < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

/**
 * Global server time offset in milliseconds (server - client).
 * Initialized to 0 and calibrated whenever an API response with Date/serverTime is received.
 */
let serverTimeOffsetMs = 0;

/**
 * Updates the client-to-server time offset using a server timestamp (ISO string or epoch ms).
 * @param {string|number|Date} serverTimestamp
 */
export function setServerTimeSync(serverTimestamp) {
  try {
    const serverDate = new Date(serverTimestamp);
    if (!isNaN(serverDate.getTime())) {
      serverTimeOffsetMs = serverDate.getTime() - Date.now();
    }
  } catch (err) {
    console.warn('Failed to parse server timestamp for sync:', err);
  }
}

/**
 * Returns current synchronized server date.
 * If server time was fetched/synced, uses Date.now() + serverTimeOffsetMs.
 * Otherwise uses client's current Date.
 * @returns {Date}
 */
export function getCurrentServerDate() {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Fetches server time from /api/time to synchronize client and server time.
 * Returns the server greeting or falls back to client-calculated IST greeting.
 */
export async function fetchServerGreeting() {
  try {
    const res = await fetch('/api/time');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.serverTime) {
      setServerTimeSync(data.serverTime);
    }
    if (data.greeting) {
      return data.greeting;
    }
  } catch {
    // If server is unreachable or offline, calculate greeting from current time in IST
  }
  return getTimeBasedGreeting(getCurrentServerDate());
}
