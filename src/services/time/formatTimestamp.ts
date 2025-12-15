/**
 * Formats a timestamp using a specific locale and timezone.
 *
 * - locale controls formatting style (en-GB, en-US, etc)
 * - timeZone must be an IANA timezone (UTC, America/New_York, Europe/London)
 */
export function formatTimestamp(
  ts: number,
  timeZone: string = "UTC",
  locale: string = "en-GB",
): string {
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