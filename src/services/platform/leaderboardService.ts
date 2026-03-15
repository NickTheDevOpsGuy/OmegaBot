// src/services/platform/leaderboardService.ts
//
// Leaderboard facade: global, server (guild), weekly, per-game.
// Aggregates from existing stores for use by Discord commands and web API.

import { getDb } from "../core/database/db.js";
import { getFunUsageSnapshot } from "../stores/fun/funUsageStore.js";

export type LeaderboardScope = "global" | "server" | "weekly" | "per_game";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  value: number;
  label?: string;
};

/**
 * Get a generic usage leaderboard (top users by command usage).
 * Snapshot is global (no guild filter in current store). For per-game leaderboards use getGameLeaderboard.
 */
export async function getUsageLeaderboard(options: {
  scope: "users" | "commands";
  limit?: number;
}): Promise<LeaderboardEntry[] | { command: string; count: number }[]> {
  const snapshot = await getFunUsageSnapshot();
  const limit = options.limit ?? 25;

  if (options.scope === "users") {
    const totals = snapshot?.totalsByUser ?? {};
    const users = Object.entries(totals)
      .map(([userId, count]) => ({ userId, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    return users.map((u, i) => ({ rank: i + 1, userId: u.userId, value: u.value }));
  }

  const totalsByCommand = snapshot?.totalsByCommand ?? {};
  return Object.entries(totalsByCommand)
    .map(([command, count]) => ({ command, count: Number(count) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Placeholder: per-game leaderboard. Call game-specific stores (e.g. slots getLeaderboard) from API. */
export function getGameLeaderboard(
  gameType: string,
  _options?: { guildId?: string | null; limit?: number },
): LeaderboardEntry[] {
  const db = getDb();
  const limit = _options?.limit ?? 25;
  if (gameType === "slots") {
    const rows = db
      .prepare(
        `SELECT user_id AS userId, jackpots AS value FROM slots_stats WHERE jackpots > 0 ORDER BY jackpots DESC LIMIT ?`,
      )
      .all(limit) as { userId: string; value: number }[];
    return rows.map((r, i) => ({ rank: i + 1, userId: r.userId, value: r.value }));
  }
  if (gameType === "daily") {
    const rows = db
      .prepare(
        `SELECT user_id AS userId, points AS value FROM daily_checkins ORDER BY points DESC LIMIT ?`,
      )
      .all(limit) as { userId: string; value: number }[];
    return rows.map((r, i) => ({ rank: i + 1, userId: r.userId, value: r.value }));
  }
  return [];
}
