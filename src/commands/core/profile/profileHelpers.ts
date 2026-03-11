// src/commands/profile/profileHelpers.ts
//
// Shared DB and formatting helpers for profile subcommands.

import { getDb } from "../../../services/core/database/db.js";
import { getTotalWins, getScalar, getCount } from "../../../services/stores/gameStats/gameStats.js";

export type Db = ReturnType<typeof getDb>;

export function getAchievementCount(
  db: Db,
  userId: string,
): { earned: number; total: number } {
  const checks = [
    () => getTotalWins(db, userId) >= 1,
    () => getTotalWins(db, userId) >= 10,
    () => getTotalWins(db, userId) >= 50,
    () => getScalar(db, userId, "blackjack_stats", "blackjacks") >= 1,
    () => getScalar(db, userId, "wordle_stats", "max_streak") >= 7,
    () => getScalar(db, userId, "slots_stats", "jackpots") >= 1,
    () => getScalar(db, userId, "slots_stats", "wins") >= 5,
    () => getCount(db, "coin_flips", "user_id", userId) >= 100,
    () => getScalar(db, userId, "daily_checkins", "best_streak") >= 7,
    () => getScalar(db, userId, "daily_checkins", "best_streak") >= 30,
    () => getScalar(db, userId, "trivia_stats", "correct") >= 50,
    () => getScalar(db, userId, "trivia_stats", "best_streak") >= 10,
    () => getCount(db, "quotes", "author_id", userId) >= 1,
  ];

  let earned = 0;
  for (const check of checks) {
    try {
      if (check()) earned++;
    } catch {
      // Ignore errors
    }
  }
  return { earned, total: checks.length };
}

export function getDailyStreak(
  db: Db,
  userId: string,
): { current: number; best: number; points: number } {
  try {
    const row = db
      .prepare(`SELECT streak, best_streak, points FROM daily_checkins WHERE user_id = ?`)
      .get(userId) as { streak: number; best_streak: number; points: number } | undefined;
    if (!row) return { current: 0, best: 0, points: 0 };
    return { current: row.streak, best: row.best_streak, points: row.points };
  } catch {
    return { current: 0, best: 0, points: 0 };
  }
}

export function ensureAfkTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS afk_status (
      user_id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      set_at INTEGER NOT NULL
    )
  `);
}

export function getAfkStatus(
  db: Db,
  userId: string,
): { message: string; set_at: number } | null {
  try {
    ensureAfkTable(db);
    return db
      .prepare(`SELECT message, set_at FROM afk_status WHERE user_id = ?`)
      .get(userId) as { message: string; set_at: number } | null;
  } catch {
    return null;
  }
}

export function setAfkStatus(db: Db, userId: string, message: string): void {
  ensureAfkTable(db);
  db.prepare(
    `INSERT OR REPLACE INTO afk_status (user_id, message, set_at) VALUES (?, ?, ?)`,
  ).run(userId, message, Date.now());
}

export function clearAfkStatus(db: Db, userId: string): boolean {
  ensureAfkTable(db);
  return db.prepare(`DELETE FROM afk_status WHERE user_id = ?`).run(userId).changes > 0;
}

export function ensureTimezoneTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

export function getTimezone(db: Db, userId: string): string | null {
  try {
    ensureTimezoneTable(db);
    const row = db
      .prepare(`SELECT timezone FROM user_timezones WHERE user_id = ?`)
      .get(userId) as { timezone: string } | undefined;
    return row?.timezone ?? null;
  } catch {
    return null;
  }
}

export function setTimezone(db: Db, userId: string, timezone: string): void {
  ensureTimezoneTable(db);
  db.prepare(
    `INSERT OR REPLACE INTO user_timezones (user_id, timezone, updated_at) VALUES (?, ?, ?)`,
  ).run(userId, timezone, Date.now());
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function formatTimeInZone(timezone: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
