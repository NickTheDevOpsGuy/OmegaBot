/**
 * Format a Unix timestamp into a readable date/time string.
 *
 * - Uses 24-hour (military) time
 * - Allows caller to control locale and timezone
 *
 * @param {number} ts - Unix timestamp (milliseconds)
 * @param {string} locale - Locale string (ex: "en-GB", "en-US")
 * @param {string} timeZone - IANA timezone (ex: "UTC", "America/New_York")
 * @returns {string}
 */
export function formatTimestamp(
  ts: number,
  locale = "en-GB",
  timeZone = "UTC",
) {
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
