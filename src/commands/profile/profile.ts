// src/commands/profile/profile.ts
//
// User profile management with stats, AFK status, and timezone.
//
// Subcommands:
// - /profile view [@user]     - View profile with game stats, achievements, daily streak
// - /profile afk [message]    - Set or clear AFK status
// - /profile timezone [zone]  - Set or view timezone
//
// This consolidates the old /afk and /timezone commands into the profile.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../services/database/db.js";
import {
  getTotalWins,
  getTotalGamesPlayed,
  getScalar,
  getCount,
} from "../../services/gameStats/gameStats.js";
import { logger } from "../../utils/logger.js";

/* -------------------------------------------------------------------------- */
/* Stat Fetchers                                                               */
/* -------------------------------------------------------------------------- */

function getAchievementCount(
  db: ReturnType<typeof getDb>,
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

function getDailyStreak(
  db: ReturnType<typeof getDb>,
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

/* -------------------------------------------------------------------------- */
/* AFK Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function ensureAfkTable(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS afk_status (
      user_id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      set_at INTEGER NOT NULL
    )
  `);
}

function getAfkStatus(
  db: ReturnType<typeof getDb>,
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

function setAfkStatus(
  db: ReturnType<typeof getDb>,
  userId: string,
  message: string,
): void {
  ensureAfkTable(db);
  db.prepare(
    `INSERT OR REPLACE INTO afk_status (user_id, message, set_at) VALUES (?, ?, ?)`,
  ).run(userId, message, Date.now());
}

function clearAfkStatus(db: ReturnType<typeof getDb>, userId: string): boolean {
  ensureAfkTable(db);
  const result = db.prepare(`DELETE FROM afk_status WHERE user_id = ?`).run(userId);
  return result.changes > 0;
}

/* -------------------------------------------------------------------------- */
/* Timezone Helpers                                                            */
/* -------------------------------------------------------------------------- */

function ensureTimezoneTable(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

function getTimezone(db: ReturnType<typeof getDb>, userId: string): string | null {
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

function setTimezone(
  db: ReturnType<typeof getDb>,
  userId: string,
  timezone: string,
): void {
  ensureTimezoneTable(db);
  db.prepare(
    `INSERT OR REPLACE INTO user_timezones (user_id, timezone, updated_at) VALUES (?, ?, ?)`,
  ).run(userId, timezone, Date.now());
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function formatTimeInZone(timezone: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Command                                                                     */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View and manage your profile")
  .addSubcommand((s) =>
    s
      .setName("view")
      .setDescription("View your or another user's profile")
      .addUserOption((o) => o.setName("user").setDescription("User to view"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  .addSubcommand((s) =>
    s
      .setName("afk")
      .setDescription("Set or clear your AFK status")
      .addStringOption((o) =>
        o
          .setName("message")
          .setDescription("AFK message (leave empty to clear)")
          .setMaxLength(200),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("timezone")
      .setDescription("Set or view your timezone")
      .addStringOption((o) =>
        o
          .setName("zone")
          .setDescription("IANA timezone (e.g., America/New_York, Europe/London)"),
      )
      .addUserOption((o) =>
        o.setName("user").setDescription("View another user's timezone"),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const db = getDb();

  if (sub === "view") {
    await handleView(interaction, db);
  } else if (sub === "afk") {
    await handleAfk(interaction, db);
  } else if (sub === "timezone") {
    await handleTimezone(interaction, db);
  }
}

/* -------------------------------------------------------------------------- */
/* View Handler                                                                */
/* -------------------------------------------------------------------------- */

async function handleView(
  interaction: ChatInputCommandInteraction,
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const ephemeral = interaction.options.getBoolean("private") ?? false;
  await interaction.deferReply({ ephemeral });

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);

  const totalGames = getTotalGamesPlayed(db, targetUser.id);
  const totalWins = getTotalWins(db, targetUser.id);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const achievements = getAchievementCount(db, targetUser.id);
  const daily = getDailyStreak(db, targetUser.id);
  const afk = getAfkStatus(db, targetUser.id);
  const timezone = getTimezone(db, targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor ?? 0x5865f2);

  // Account info
  const accountLines = [
    `📅 **Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
  ];

  if (member?.joinedTimestamp) {
    accountLines.push(
      `🏠 **Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    );
  }

  if (timezone) {
    accountLines.push(`🕐 **Time:** ${formatTimeInZone(timezone)} (${timezone})`);
  }

  if (afk) {
    accountLines.push(`💤 **AFK:** ${afk.message}`);
  }

  embed.addFields({ name: "📋 Info", value: accountLines.join("\n"), inline: false });

  // Gaming stats
  if (totalGames > 0) {
    embed.addFields({
      name: "🎮 Gaming",
      value: [`Games: **${totalGames}**`, `Wins: **${totalWins}** (${winRate}%)`].join(
        "\n",
      ),
      inline: true,
    });
  }

  // Daily & Streaks
  if (daily.points > 0 || daily.current > 0) {
    embed.addFields({
      name: "📅 Daily",
      value: [
        `Points: **${daily.points}**`,
        `Streak: **${daily.current}** 🔥`,
        `Best: **${daily.best}** 🏆`,
      ].join("\n"),
      inline: true,
    });
  }

  // Achievements
  const progressBarLength = 10;
  const filledCount = Math.round(
    (achievements.earned / achievements.total) * progressBarLength,
  );
  const progressBar =
    "█".repeat(filledCount) + "░".repeat(progressBarLength - filledCount);

  embed.addFields({
    name: "🏆 Achievements",
    value: `**${achievements.earned}**/${achievements.total}\n[${progressBar}]`,
    inline: true,
  });

  await interaction.editReply({ embeds: [embed] });
}

/* -------------------------------------------------------------------------- */
/* AFK Handler                                                                 */
/* -------------------------------------------------------------------------- */

async function handleAfk(
  interaction: ChatInputCommandInteraction,
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const message = interaction.options.getString("message");

  if (!message) {
    // Clear AFK
    const cleared = clearAfkStatus(db, interaction.user.id);
    if (cleared) {
      await interaction.reply({
        content: "✅ Welcome back! Your AFK status has been cleared.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({ content: "You weren't AFK.", ephemeral: true });
    }
    return;
  }

  // Set AFK
  setAfkStatus(db, interaction.user.id, message);
  await interaction.reply({ content: `💤 You're now AFK: ${message}`, ephemeral: false });

  logger.info({ userId: interaction.user.id, message }, "[profile/afk] AFK status set");
}

/* -------------------------------------------------------------------------- */
/* Timezone Handler                                                            */
/* -------------------------------------------------------------------------- */

async function handleTimezone(
  interaction: ChatInputCommandInteraction,
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const zone = interaction.options.getString("zone");
  const targetUser = interaction.options.getUser("user");

  // View another user's timezone
  if (targetUser) {
    const tz = getTimezone(db, targetUser.id);
    if (tz) {
      await interaction.reply({
        content: `🕐 **${targetUser.username}**'s timezone is **${tz}**\nCurrent time: **${formatTimeInZone(tz)}**`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `${targetUser.username} hasn't set their timezone yet.`,
        ephemeral: true,
      });
    }
    return;
  }

  // View own timezone
  if (!zone) {
    const tz = getTimezone(db, interaction.user.id);
    if (tz) {
      await interaction.reply({
        content: `🕐 Your timezone is **${tz}**\nCurrent time: **${formatTimeInZone(tz)}**`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content:
          "You haven't set a timezone yet. Use `/profile timezone zone:America/New_York` to set one.",
        ephemeral: true,
      });
    }
    return;
  }

  // Set timezone
  if (!isValidTimezone(zone)) {
    await interaction.reply({
      content: `❌ Invalid timezone: \`${zone}\`\n\nExamples: \`America/New_York\`, \`Europe/London\`, \`Asia/Tokyo\`, \`UTC\`\n[Full list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)`,
      ephemeral: true,
    });
    return;
  }

  setTimezone(db, interaction.user.id, zone);
  await interaction.reply({
    content: `✅ Timezone set to **${zone}**\nCurrent time: **${formatTimeInZone(zone)}**`,
    ephemeral: true,
  });

  logger.info(
    { userId: interaction.user.id, timezone: zone },
    "[profile/timezone] timezone set",
  );
}
