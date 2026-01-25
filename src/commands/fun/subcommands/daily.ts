// src/commands/fun/subcommands/daily.ts
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

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

type DailyStats = {
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  points: number;
  lastCheckin: number;
  canCheckIn: boolean;
  hoursUntilReset: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_GRACE_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 hours to maintain streak

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getStats(userId: string): DailyStats {
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

  // Can check in if last check-in was before today
  const canCheckIn = lastCheckinDay < todayStart;

  // Hours until they can check in again (if they already checked in today)
  const hoursUntilReset = canCheckIn
    ? 0
    : Math.ceil((tomorrowStart - now) / (60 * 60 * 1000));

  // Check if streak is broken (more than 48 hours since last check-in)
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
  // Base 10 points + streak bonus
  const base = 10;
  const streakBonus = Math.min(streak * 2, 50); // Cap at +50 for streak
  const milestoneBonus =
    streak > 0 && streak % 7 === 0
      ? 25 // Weekly bonus
      : streak > 0 && streak % 30 === 0
        ? 100 // Monthly bonus
        : 0;

  return base + streakBonus + milestoneBonus;
}

function doCheckIn(userId: string): {
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

  // Determine new streak
  let newStreak: number;
  if (stats.lastCheckin === 0) {
    // First check-in ever
    newStreak = 1;
  } else if (now - stats.lastCheckin > STREAK_GRACE_PERIOD_MS) {
    // Streak broken
    newStreak = 1;
  } else {
    // Continue streak
    newStreak = stats.streak + 1;
  }

  const points = calculatePoints(newStreak);
  const isNewBest = newStreak > stats.bestStreak;

  // Determine milestone
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

function getDailyLeaderboard(limit: number): Array<{
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

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStats = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;

  try {
    // Show leaderboard
    if (showLeaderboard) {
      const leaders = getDailyLeaderboard(10);

      if (leaders.length === 0) {
        await interaction.editReply(
          "📅 **Daily Leaderboard**\n\nNo check-ins yet! Be the first with `/fun daily`",
        );
        return;
      }

      const medals = ["🥇", "🥈", "🥉"];
      const lines = ["📅 **Daily Check-in Leaderboard**", ""];

      leaders.forEach((l, i) => {
        const prefix = medals[i] ?? `${i + 1}.`;
        const streakEmoji = l.streak >= 7 ? "🔥" : "";
        lines.push(`${prefix} <@${l.userId}> — ${l.points} pts ${streakEmoji}`);
        lines.push(
          `   └ Streak: ${l.streak} days | Best: ${l.bestStreak} | Total: ${l.totalCheckins}`,
        );
      });

      await interaction.editReply(lines.join("\n"));
      return;
    }

    // Show stats
    if (showStats) {
      const stats = getStats(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle("📅 Daily Check-in Stats")
        .setColor(stats.streak >= 7 ? 0xf59e0b : 0x5865f2)
        .addFields(
          { name: "🔥 Current Streak", value: `${stats.streak} days`, inline: true },
          { name: "⭐ Best Streak", value: `${stats.bestStreak} days`, inline: true },
          { name: "📊 Total Points", value: `${stats.points}`, inline: true },
          { name: "✅ Total Check-ins", value: `${stats.totalCheckins}`, inline: true },
        );

      if (stats.canCheckIn) {
        embed.setFooter({ text: "✨ You can check in now!" });
      } else {
        embed.setFooter({
          text: `⏰ Next check-in available in ${stats.hoursUntilReset}h`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Do check-in
    const stats = getStats(interaction.user.id);

    if (!stats.canCheckIn) {
      await interaction.editReply(
        `⏰ You've already checked in today!\n\nCome back in **${stats.hoursUntilReset} hours** to continue your streak.\n🔥 Current streak: **${stats.streak} days**`,
      );
      return;
    }

    const result = doCheckIn(interaction.user.id);

    const streakEmoji = result.streak >= 30 ? "👑" : result.streak >= 7 ? "🔥" : "✨";

    const embed = new EmbedBuilder()
      .setTitle("📅 Daily Check-in!")
      .setColor(0x57f287)
      .setDescription(
        [
          `**+${result.points} points** earned!`,
          "",
          `${streakEmoji} **Streak: ${result.streak} days**`,
          result.isNewBest ? "🎉 **New personal best!**" : "",
          result.milestone ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .setFooter({ text: "Come back tomorrow to keep your streak!" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    if (err instanceof Error && err.message === "Already checked in today") {
      const stats = getStats(interaction.user.id);
      await interaction.editReply(
        `⏰ You've already checked in today!\n\nCome back in **${stats.hoursUntilReset} hours**.\n🔥 Current streak: **${stats.streak} days**`,
      );
      return;
    }

    logger.error({ err, userId: interaction.user.id }, "[fun/daily] failed");
    await interaction.editReply("Something went wrong with check-in.");
  }
}
