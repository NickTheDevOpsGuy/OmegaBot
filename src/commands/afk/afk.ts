// src/commands/afk/afk.ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureAfkTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS afk_status (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      message TEXT NOT NULL,
      set_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_afk_guild ON afk_status(guild_id);
  `);
}

type AfkRow = {
  user_id: string;
  guild_id: string;
  message: string;
  set_at: number;
};

export function setAfk(userId: string, guildId: string, message: string): void {
  ensureAfkTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `INSERT INTO afk_status (user_id, guild_id, message, set_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       guild_id = ?,
       message = ?,
       set_at = ?`,
  ).run(userId, guildId, message, now, guildId, message, now);
}

export function clearAfk(userId: string): boolean {
  ensureAfkTable();
  const db = getDb();

  const result = db.prepare(`DELETE FROM afk_status WHERE user_id = ?`).run(userId);
  return result.changes > 0;
}

export function getAfk(userId: string): AfkRow | null {
  ensureAfkTable();
  const db = getDb();

  return db
    .prepare(`SELECT * FROM afk_status WHERE user_id = ?`)
    .get(userId) as AfkRow | null;
}

export function getAfkUsers(userIds: string[]): AfkRow[] {
  if (userIds.length === 0) return [];

  ensureAfkTable();
  const db = getDb();

  const placeholders = userIds.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM afk_status WHERE user_id IN (${placeholders})`)
    .all(...userIds) as AfkRow[];
}

/* -------------------------------------------------------------------------- */
/* Time formatting                                                             */
/* -------------------------------------------------------------------------- */

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/* -------------------------------------------------------------------------- */
/* Command definition                                                          */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("afk")
  .setDescription("Set your AFK status")
  .addStringOption((o) =>
    o
      .setName("message")
      .setDescription("Your AFK message (leave empty to clear)")
      .setMaxLength(200),
  );

export const group = "utility";

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "AFK can only be used in a server!",
      ephemeral: true,
    });
    return;
  }

  const message = interaction.options.getString("message")?.trim();

  // Clear AFK if no message provided
  if (!message) {
    const wasAfk = clearAfk(interaction.user.id);

    if (wasAfk) {
      await interaction.reply({
        content: "👋 Welcome back! Your AFK status has been cleared.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "You weren't AFK!",
        ephemeral: true,
      });
    }
    return;
  }

  // Set AFK
  setAfk(interaction.user.id, interaction.guildId, message);

  await interaction.reply({
    content: `💤 You're now AFK: **${message}**\n\nI'll let people know when they ping you. Send any message to remove your AFK status.`,
  });
}

/* -------------------------------------------------------------------------- */
/* Message handler (to be registered in bot.ts)                                */
/* -------------------------------------------------------------------------- */

export async function handleAfkMentions(message: Message): Promise<void> {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  // Check if the author is AFK and clear their status
  const authorAfk = getAfk(message.author.id);
  if (authorAfk) {
    clearAfk(message.author.id);
    const duration = formatDuration(Date.now() - authorAfk.set_at);

    try {
      await message.reply({
        content: `👋 Welcome back, ${message.author}! You were AFK for ${duration}.`,
        allowedMentions: { users: [] },
      });
    } catch {
      // Might not have permission to reply
    }
  }

  // Check if any mentioned users are AFK
  const mentionedIds = message.mentions.users.map((u) => u.id);
  if (mentionedIds.length === 0) return;

  const afkUsers = getAfkUsers(mentionedIds);
  if (afkUsers.length === 0) return;

  const responses = afkUsers.map((afk) => {
    const duration = formatDuration(Date.now() - afk.set_at);
    return `💤 <@${afk.user_id}> is AFK: **${afk.message}** (${duration})`;
  });

  try {
    await message.reply({
      content: responses.join("\n"),
      allowedMentions: { users: [] },
    });
  } catch (err) {
    logger.debug({ err }, "[afk] failed to send AFK notification");
  }
}
