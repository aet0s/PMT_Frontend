import { useState, useEffect } from 'react';
import { getApiUrl } from '../api/config';

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
let isSynced = false;

/**
 * Updates the client-to-server time offset using a server timestamp (ISO string or epoch ms).
 * Dispatches 'server-time-updated' custom event to trigger UI re-renders.
 * @param {string|number|Date} serverTimestamp
 */
export function setServerTimeSync(serverTimestamp) {
  try {
    const sTime = typeof serverTimestamp === 'number'
      ? serverTimestamp
      : new Date(serverTimestamp).getTime();
    if (!isNaN(sTime)) {
      serverTimeOffsetMs = sTime - Date.now();
      isSynced = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('server-time-updated', {
          detail: {
            offset: serverTimeOffsetMs,
            now: getCurrentServerDate()
          }
        }));
      }
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

export function getServerNow() {
  return getCurrentServerDate();
}

/**
 * React hook that returns the current synchronized server Date.
 * Re-renders whenever server time is calibrated or when the clock advances.
 * @returns {Date}
 */
export function useServerNow() {
  const [now, setNow] = useState(() => getCurrentServerDate());

  useEffect(() => {
    const handleUpdate = () => {
      setNow(getCurrentServerDate());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('server-time-updated', handleUpdate);
    }

    const interval = setInterval(() => {
      setNow(getCurrentServerDate());
    }, 30000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('server-time-updated', handleUpdate);
      }
      clearInterval(interval);
    };
  }, []);

  return now;
}

/**
 * Fetches server time from /api/time to synchronize client and server time.
 * Returns the server greeting or falls back to client-calculated IST greeting.
 */
export async function syncServerTime() {
  try {
    const res = await fetch(getApiUrl('/api/time'), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.server_time_ms) {
      setServerTimeSync(data.server_time_ms);
    } else if (data?.serverTime || data?.server_time) {
      setServerTimeSync(data.serverTime || data.server_time);
    }
  } catch {
    // Graceful fallback
  }
}

export async function fetchServerGreeting() {
  try {
    const res = await fetch(getApiUrl('/api/time'), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.server_time_ms) {
      setServerTimeSync(data.server_time_ms);
    } else if (data.serverTime || data.server_time) {
      setServerTimeSync(data.serverTime || data.server_time);
    }
    if (data.greeting) {
      return data.greeting;
    }
  } catch {
    // If server is unreachable or offline, calculate greeting from current time in IST
  }
  return getTimeBasedGreeting(getCurrentServerDate());
}

// Automatically sync on initial script evaluation
if (typeof window !== 'undefined') {
  syncServerTime();
}

