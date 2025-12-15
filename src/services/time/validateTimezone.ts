/**
 * Validate whether a string is a valid IANA timezone.
 *
 * Examples of valid values:
 * - "UTC"
 * - "America/New_York"
 * - "Europe/London"
 *
 * This does NOT guess timezones.
 * It only validates exact IANA identifiers.
 */
export function validateTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;

  try {
    // Intl.DateTimeFormat will throw if the timezone is invalid
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
