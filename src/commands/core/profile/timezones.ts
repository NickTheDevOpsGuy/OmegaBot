// src/commands/profile/timezones.ts
// Common IANA timezones for autocomplete (subset for compatibility with Node 18+).

/** Popular IANA timezone identifiers for autocomplete. */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

export function filterTimezones(input: string, limit = 25): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return COMMON_TIMEZONES.slice(0, limit);

  return COMMON_TIMEZONES.filter(
    (tz) =>
      tz.toLowerCase().includes(needle) ||
      tz.toLowerCase().replace(/_/g, " ").includes(needle),
  ).slice(0, limit);
}
