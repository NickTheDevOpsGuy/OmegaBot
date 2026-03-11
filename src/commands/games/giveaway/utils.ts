// src/commands/giveaway/utils.ts
// Duration parsing and time-remaining formatting for giveaways.

/** Parse duration string (e.g. 10s, 30m, 1h, 1d). Returns ms or null if invalid. Min 10s, max 30 days. */
export function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = value * multipliers[unit];

  if (ms < 10_000 || ms > 30 * 24 * 60 * 60 * 1000) return null;
  return ms;
}

/** Format time left until endsAt as a short string (e.g. "2d 5h", "45m"). */
export function formatTimeLeft(endsAt: number): string {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
