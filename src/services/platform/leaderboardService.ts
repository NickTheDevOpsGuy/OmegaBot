// src/services/platform/leaderboardService.ts
//
// Leaderboard facade: global, server (guild), weekly, per-game.
// Aggregates from existing stores for use by Discord commands and web API.

import { getDb } from "../core/database/db.js";
import { getContextLogger } from "../core/logging/requestContext.js";
import { getFunUsageSnapshot } from "../stores/fun/funUsageStore.js";

export type LeaderboardScope = "global" | "server" | "weekly" | "per_game";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  value: number;
  label?: string;
};

/** Record one usage event for date/guild-scoped leaderboards. Call when recording fun command usage. */
export function recordUsageLog(args: {
  userId: string;
  command: string;
  guildId?: string | null;
}): void {
  const db = getDb();
  const log = getContextLogger();
  try {
    db.prepare(
      `INSERT INTO usage_log (user_id, guild_id, command, created_at) VALUES (?, ?, ?, ?)`,
    ).run(args.userId, args.guildId ?? null, args.command, Date.now());
  } catch (err) {
    log.debug(
      { err },
      "[leaderboard] recordUsageLog failed (usage_log table may be missing)",
    );
  }
}

function getUsageFromLog(options: {
  from?: number;
  to?: number;
  guildId?: string | null;
  limit?: number;
  scope: "users" | "commands";
}): LeaderboardEntry[] | { command: string; count: number }[] {
  const db = getDb();
  const limit = options.limit ?? 25;
  let sql =
    "SELECT user_id AS userId, command, created_at AS created_at FROM usage_log WHERE 1=1";
  const params: unknown[] = [];
  if (options.from != null) {
    sql += " AND created_at >= ?";
    params.push(options.from);
  }
  if (options.to != null) {
    sql += " AND created_at <= ?";
    params.push(options.to);
  }
  if (options.guildId != null && options.guildId !== "") {
    sql += " AND guild_id = ?";
    params.push(options.guildId);
  }
  const rows = db.prepare(sql).all(...params) as {
    userId: string;
    command: string;
    created_at: number;
  }[];
  if (options.scope === "users") {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.userId] = (counts[r.userId] ?? 0) + 1;
    }
    const entries = Object.entries(counts)
      .map(([userId, value]) => ({ userId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    return entries.map((e, i) => ({ rank: i + 1, userId: e.userId, value: e.value }));
  }
  const byCommand: Record<string, number> = {};
  for (const r of rows) {
    byCommand[r.command] = (byCommand[r.command] ?? 0) + 1;
  }
  return Object.entries(byCommand)
    .map(([command, count]) => ({ command, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get a generic usage leaderboard (top users by command usage).
 * When from/to/guildId are set, uses usage_log (weekly/server). Otherwise uses JSON snapshot (global).
 */
export async function getUsageLeaderboard(options: {
  scope: "users" | "commands";
  limit?: number;
  from?: number;
  to?: number;
  guildId?: string | null;
  window?: "weekly";
}): Promise<LeaderboardEntry[] | { command: string; count: number }[]> {
  const limit = options.limit ?? 25;
  const log = getContextLogger();
  const useLog =
    options.from != null ||
    options.to != null ||
    (options.guildId != null && options.guildId !== "") ||
    options.window === "weekly";
  if (useLog) {
    let from = options.from;
    let to = options.to;
    if (options.window === "weekly" && from == null && to == null) {
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      from = now - weekMs;
      to = now;
    }
    try {
      return getUsageFromLog({
        scope: options.scope,
        limit,
        from,
        to,
        guildId: options.guildId,
      });
    } catch (err) {
      log.warn(
        { err, options },
        "[leaderboard] usage_log query failed, falling back to snapshot",
      );
    }
  }
  const snapshot = await getFunUsageSnapshot();
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
    .map(([command, count]) => ({ command, count: Number(count) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Per-game leaderboard. Optional guildId when game stats are keyed by guild (future). */
export function getGameLeaderboard(
  gameType: string,
  options?: { guildId?: string | null; limit?: number },
): LeaderboardEntry[] {
  const db = getDb();
  const limit = options?.limit ?? 25;
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
