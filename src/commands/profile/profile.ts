// src/commands/profile/profile.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Stat Fetchers                                                               */
/* -------------------------------------------------------------------------- */

function safeQuery<T>(query: () => T | undefined): T | null {
  try {
    return query() ?? null;
  } catch {
    return null;
  }
}

function getTotalGamesPlayed(db: ReturnType<typeof getDb>, userId: string): number {
  let total = 0;
  const tables = [
    { table: "rps_stats", cols: ["wins", "losses", "ties"] },
    { table: "ttt_stats", cols: ["wins", "losses", "ties"] },
    { table: "blackjack_stats", cols: ["wins", "losses", "ties"] },
    { table: "hangman_stats", cols: ["wins", "losses"] },
    { table: "connect4_stats", cols: ["wins", "losses", "ties"] },
  ];

  for (const { table, cols } of tables) {
    try {
      const sumCols = cols.join(" + ");
      const row = db
        .prepare(`SELECT (${sumCols}) as total FROM ${table} WHERE user_id = ?`)
        .get(userId) as { total: number } | undefined;
      if (row?.total) total += row.total;
    } catch {
      // Table might not exist
    }
  }

  return total;
}

function getTotalWins(db: ReturnType<typeof getDb>, userId: string): number {
  let total = 0;
  const tables = ["rps_stats", "ttt_stats", "blackjack_stats", "hangman_stats", "connect4_stats"];

  for (const table of tables) {
    try {
      const row = db
        .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
        .get(userId) as { wins: number } | undefined;
      if (row?.wins) total += row.wins;
    } catch {
      // Table might not exist
    }
  }

  return total;
}

function getAchievementCount(db: ReturnType<typeof getDb>, userId: string): { earned: number; total: number } {
  // Simplified achievement check - mirrors achievements.ts logic
  const checks = [
    // Games
    () => getTotalWins(db, userId) >= 1,
    () => getTotalWins(db, userId) >= 10,
    () => getTotalWins(db, userId) >= 50,
    () => {
      const row = db.prepare(`SELECT blackjacks FROM blackjack_stats WHERE user_id = ?`).get(userId) as { blackjacks: number } | undefined;
      return (row?.blackjacks ?? 0) >= 1;
    },
    () => {
      const row = db.prepare(`SELECT max_streak FROM wordle_stats WHERE user_id = ?`).get(userId) as { max_streak: number } | undefined;
      return (row?.max_streak ?? 0) >= 7;
    },
    // Luck
    () => {
      const row = db.prepare(`SELECT jackpots FROM slots_stats WHERE user_id = ?`).get(userId) as { jackpots: number } | undefined;
      return (row?.jackpots ?? 0) >= 1;
    },
    () => {
      const row = db.prepare(`SELECT wins FROM slots_stats WHERE user_id = ?`).get(userId) as { wins: number } | undefined;
      return (row?.wins ?? 0) >= 5;
    },
    () => {
      const row = db.prepare(`SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ?`).get(userId) as { count: number };
      return row.count >= 100;
    },
    // Dedication
    () => {
      const row = db.prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`).get(userId) as { best_streak: number } | undefined;
      return (row?.best_streak ?? 0) >= 7;
    },
    () => {
      const row = db.prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`).get(userId) as { best_streak: number } | undefined;
      return (row?.best_streak ?? 0) >= 30;
    },
    () => {
      const row = db.prepare(`SELECT correct FROM trivia_stats WHERE user_id = ?`).get(userId) as { correct: number } | undefined;
      return (row?.correct ?? 0) >= 50;
    },
    () => {
      const row = db.prepare(`SELECT best_streak FROM trivia_stats WHERE user_id = ?`).get(userId) as { best_streak: number } | undefined;
      return (row?.best_streak ?? 0) >= 10;
    },
    // Social
    () => {
      const row = db.prepare(`SELECT COUNT(*) as count FROM quotes WHERE author_id = ?`).get(userId) as { count: number };
      return row.count >= 1;
    },
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

function getDailyStreak(db: ReturnType<typeof getDb>, userId: string): { current: number; best: number; points: number } {
  try {
    const row = db
      .prepare(`SELECT streak, best_streak, points FROM daily_checkins WHERE user_id = ?`)
      .get(userId) as { streak: number; best_streak: number; points: number } | undefined;

    return row ?? { current: 0, best: 0, points: 0 };
  } catch {
    return { current: 0, best: 0, points: 0 };
  }
}

function getFavoriteCommand(db: ReturnType<typeof getDb>, userId: string): string | null {
  try {
    const row = db
      .prepare(
        `SELECT command, COUNT(*) as count FROM fun_usage 
         WHERE user_id = ? 
         GROUP BY command 
         ORDER BY count DESC 
         LIMIT 1`,
      )
      .get(userId) as { command: string; count: number } | undefined;

    return row ? `${row.command} (${row.count} uses)` : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Command                                                                     */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your or another user's profile")
  .addUserOption((o) =>
    o.setName("user").setDescription("User to view profile for"),
  )
  .addBooleanOption((o) =>
    o.setName("private").setDescription("Only show to you"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const ephemeral = interaction.options.getBoolean("private") ?? false;
  await interaction.deferReply({ ephemeral });

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);
  const db = getDb();

  const totalGames = getTotalGamesPlayed(db, targetUser.id);
  const totalWins = getTotalWins(db, targetUser.id);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const achievements = getAchievementCount(db, targetUser.id);
  const daily = getDailyStreak(db, targetUser.id);
  const favoriteCommand = getFavoriteCommand(db, targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor ?? 0x5865f2);

  // Account info
  const accountLines = [
    `📅 **Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
  ];

  if (member?.joinedTimestamp) {
    accountLines.push(`🏠 **Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
  }

  embed.addFields({ name: "📋 Account", value: accountLines.join("\n"), inline: false });

  // Gaming stats
  if (totalGames > 0) {
    embed.addFields({
      name: "🎮 Gaming",
      value: [
        `Games Played: **${totalGames}**`,
        `Wins: **${totalWins}** (${winRate}% win rate)`,
        favoriteCommand ? `Favorite: **${favoriteCommand}**` : null,
      ].filter(Boolean).join("\n"),
      inline: true,
    });
  }

  // Daily & Streaks
  if (daily.points > 0 || daily.current > 0) {
    embed.addFields({
      name: "📅 Daily",
      value: [
        `Points: **${daily.points}**`,
        `Current Streak: **${daily.current}** 🔥`,
        `Best Streak: **${daily.best}** 🏆`,
      ].join("\n"),
      inline: true,
    });
  }

  // Achievements
  embed.addFields({
    name: "🏆 Achievements",
    value: `**${achievements.earned}**/${achievements.total} unlocked`,
    inline: true,
  });

  // Progress bar for achievements
  const progressBarLength = 10;
  const filledCount = Math.round((achievements.earned / achievements.total) * progressBarLength);
  const progressBar = "█".repeat(filledCount) + "░".repeat(progressBarLength - filledCount);
  embed.setFooter({ text: `Achievement Progress: [${progressBar}] ${Math.round((achievements.earned / achievements.total) * 100)}%` });

  await interaction.editReply({ embeds: [embed] });
}
