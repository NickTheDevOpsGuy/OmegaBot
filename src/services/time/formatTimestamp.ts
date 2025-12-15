/**
 * Format a Unix timestamp (ms) into a readable date/time string.
 *
 * - Uses 24-hour time (hour12: false)
 * - Caller controls locale + timezone
 *
 * @param ts - Timestamp in milliseconds
 * @param timeZone - IANA timezone (ex: "America/New_York")
 * @param locale - Locale string (ex: "en-GB", "en-US")
 */
export function formatTimestamp(ts: number, timeZone: string, locale: string): string {
  return new Date(ts).toLocaleString(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
