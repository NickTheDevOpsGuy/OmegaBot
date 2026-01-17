// src/services/time/validateTimeZone.ts

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
 *
 * Note:
 * We intentionally do NOT log here. Invalid timezone input is normal user input,
 * not an operational error. Callers can decide how to message the user.
 */
export function validateTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;

  try {
    // Intl.DateTimeFormat will throw if the timezone is invalid.
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
