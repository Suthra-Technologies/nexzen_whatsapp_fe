/**
 * Date and Time Formatting Utilities for Support Center
 * 
 * Provides:
 * 1. formatTimeOnly: 12-hour clean time (e.g. "5:51 PM") without seconds.
 * 2. formatContextualDateTime: Context-aware date/time (Today: "5:51 PM", Yesterday: "Yesterday · 5:51 PM",
 *    Current year: "Sep 22 · 5:51 PM", Older year: "Sep 22, 2025 · 5:51 PM").
 * 3. formatDateSeparator: Subtle date banner for chat day transitions (e.g. "Sep 22, 2026").
 * 4. isSameDay: Date day boundary comparator.
 * 5. getSessionWindowRemaining: Computes exact remaining time in 24h WhatsApp session window from raw timestamp.
 */

/**
 * Checks if two dates represent the same calendar day in the local timezone.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Checks if target date is yesterday relative to reference date (default: now).
 */
export function isYesterday(target: Date, relativeTo: Date = new Date()): boolean {
  const yesterday = new Date(relativeTo);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(target, yesterday);
}

/**
 * Formats time only in 12-hour format without seconds (e.g. "5:51 PM").
 * Respects local timezone.
 */
export function formatTimeOnly(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Contextual date and time formatting for conversation rows and system events:
 * - Today: "5:51 PM"
 * - Yesterday: "Yesterday · 5:51 PM"
 * - Older within current year: "Sep 22 · 5:51 PM"
 * - Previous year: "Sep 22, 2025 · 5:51 PM"
 */
export function formatContextualDateTime(
  dateInput: string | number | Date | undefined | null,
  relativeTo: Date = new Date()
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const timeStr = formatTimeOnly(date);

  // If today -> show time only
  if (isSameDay(date, relativeTo)) {
    return timeStr;
  }

  // If yesterday -> "Yesterday · 5:51 PM"
  if (isYesterday(date, relativeTo)) {
    return `Yesterday · ${timeStr}`;
  }

  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();

  // If older but within current year -> "Sep 22 · 5:51 PM"
  if (date.getFullYear() === relativeTo.getFullYear()) {
    return `${month} ${day} · ${timeStr}`;
  }

  // If previous year -> "Sep 22, 2025 · 5:51 PM"
  return `${month} ${day}, ${date.getFullYear()} · ${timeStr}`;
}

/**
 * Formats a message day transition separator:
 * e.g. "Sep 22, 2026" or "Sep 23, 2026"
 */
export function formatDateSeparator(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Calculates remaining time in the 24-hour WhatsApp session window.
 * Returns formatted string like "18:42" or null if window is expired.
 */
export function getSessionWindowRemaining(lastUserTimestamp: string | number | Date | undefined | null): string | null {
  if (!lastUserTimestamp) return null;
  const lastUserTime = typeof lastUserTimestamp === 'string' || typeof lastUserTimestamp === 'number'
    ? new Date(lastUserTimestamp).getTime()
    : lastUserTimestamp.getTime();

  if (isNaN(lastUserTime)) return null;

  const msElapsed = Date.now() - lastUserTime;
  const msRemaining = (24 * 60 * 60 * 1000) - msElapsed;

  if (msRemaining <= 0) return null;

  const totalMinutes = Math.floor(msRemaining / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, '0')}`;
}
