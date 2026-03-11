// src/commands/fun/subcommands/daily/dailyStore.ts
// Daily check-in: schema, stats, check-in, leaderboard.

import { getDb } from "../../../../../../services/core/database/db.js";

export type DailyStats = {
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  points: number;
  lastCheckin: number;
  canCheckIn: boolean;
  hoursUntilReset: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

function ensureDailyTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_checkins (
      user_id TEXT PRIMARY KEY,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      total_checkins INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      last_checkin INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getStats(userId: string): DailyStats {
  ensureDailyTable();
  const db = getDb();

  type Row = {
    streak: number;
    best_streak: number;
    total_checkins: number;
    points: number;
    last_checkin: number;
  };

  const row = db
    .prepare(
      `SELECT streak, best_streak, total_checkins, points, last_checkin FROM daily_checkins WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  const now = Date.now();

  if (!row) {
    return {
      streak: 0,
      bestStreak: 0,
      totalCheckins: 0,
      points: 0,
      lastCheckin: 0,
      canCheckIn: true,
      hoursUntilReset: 0,
    };
  }

  const lastCheckinDay = getStartOfDay(row.last_checkin);
  const todayStart = getStartOfDay(now);
  const tomorrowStart = todayStart + DAY_MS;

  const canCheckIn = lastCheckinDay < todayStart;
  const hoursUntilReset = canCheckIn
    ? 0
    : Math.ceil((tomorrowStart - now) / (60 * 60 * 1000));

  const streakBroken = now - row.last_checkin > STREAK_GRACE_PERIOD_MS;

  return {
    streak: streakBroken ? 0 : row.streak,
    bestStreak: row.best_streak,
    totalCheckins: row.total_checkins,
    points: row.points,
    lastCheckin: row.last_checkin,
    canCheckIn,
    hoursUntilReset,
  };
}

function calculatePoints(streak: number): number {
  const base = 10;
  const streakBonus = Math.min(streak * 2, 50);
  const milestoneBonus =
    streak > 0 && streak % 7 === 0 ? 25 : streak > 0 && streak % 30 === 0 ? 100 : 0;

  return base + streakBonus + milestoneBonus;
}

export function doCheckIn(userId: string): {
  points: number;
  streak: number;
  isNewBest: boolean;
  milestone: string | null;
} {
  ensureDailyTable();
  const db = getDb();
  const now = Date.now();

  const stats = getStats(userId);

  if (!stats.canCheckIn) {
    throw new Error("Already checked in today");
  }

  let newStreak: number;
  if (stats.lastCheckin === 0) {
    newStreak = 1;
  } else if (now - stats.lastCheckin > STREAK_GRACE_PERIOD_MS) {
    newStreak = 1;
  } else {
    newStreak = stats.streak + 1;
  }

  const points = calculatePoints(newStreak);
  const isNewBest = newStreak > stats.bestStreak;

  let milestone: string | null = null;
  if (newStreak === 7) milestone = "🎉 1 Week Streak!";
  else if (newStreak === 14) milestone = "🎉 2 Week Streak!";
  else if (newStreak === 30) milestone = "🏆 1 Month Streak!";
  else if (newStreak === 60) milestone = "🏆 2 Month Streak!";
  else if (newStreak === 100) milestone = "👑 100 Day Streak!";
  else if (newStreak === 365) milestone = "👑 1 Year Streak!";

  db.prepare(
    `
    INSERT INTO daily_checkins (user_id, streak, best_streak, total_checkins, points, last_checkin, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      streak = ?,
      best_streak = MAX(best_streak, ?),
      total_checkins = total_checkins + 1,
      points = points + ?,
      last_checkin = ?,
      updated_at = ?
  `,
  ).run(
    userId,
    newStreak,
    newStreak,
    points,
    now,
    now,
    newStreak,
    newStreak,
    points,
    now,
    now,
  );

  return { points, streak: newStreak, isNewBest, milestone };
}

export function getDailyLeaderboard(limit: number): Array<{
  userId: string;
  points: number;
  streak: number;
  bestStreak: number;
  totalCheckins: number;
}> {
  ensureDailyTable();
  const db = getDb();

  type Row = {
    user_id: string;
    points: number;
    streak: number;
    best_streak: number;
    total_checkins: number;
  };

  const rows = db
    .prepare(
      `SELECT user_id, points, streak, best_streak, total_checkins 
       FROM daily_checkins 
       ORDER BY points DESC 
       LIMIT ?`,
    )
    .all(limit) as Row[];

  return rows.map((r) => ({
    userId: r.user_id,
    points: r.points,
    streak: r.streak,
    bestStreak: r.best_streak,
    totalCheckins: r.total_checkins,
  }));
}
