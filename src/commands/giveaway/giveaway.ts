// src/commands/giveaway/giveaway.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureGiveawayTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER NOT NULL DEFAULT 1,
      ends_at INTEGER NOT NULL,
      ended INTEGER NOT NULL DEFAULT 0,
      winners TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      entered_at INTEGER NOT NULL,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_ends ON giveaways(ends_at) WHERE ended = 0;
  `);
}

type Giveaway = {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  host_id: string;
  prize: string;
  winner_count: number;
  ends_at: number;
  ended: number;
  winners: string | null;
  created_at: number;
};

function createGiveaway(data: {
  guildId: string;
  channelId: string;
  hostId: string;
  prize: string;
  winnerCount: number;
  endsAt: number;
}): number {
  ensureGiveawayTables();
  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winner_count, ends_at, ended, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(data.guildId, data.channelId, data.hostId, data.prize, data.winnerCount, data.endsAt, now);

  return Number(result.lastInsertRowid);
}

function setGiveawayMessage(giveawayId: number, messageId: string): void {
  const db = getDb();
  db.prepare(`UPDATE giveaways SET message_id = ? WHERE id = ?`).run(messageId, giveawayId);
}

function getGiveaway(giveawayId: number): Giveaway | null {
  ensureGiveawayTables();
  const db = getDb();
  return db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as Giveaway | null;
}

function getGiveawayByMessage(messageId: string): Giveaway | null {
  ensureGiveawayTables();
  const db = getDb();
  return db.prepare(`SELECT * FROM giveaways WHERE message_id = ?`).get(messageId) as Giveaway | null;
}

function getActiveGiveaways(guildId: string): Giveaway[] {
  ensureGiveawayTables();
  const db = getDb();
  return db
    .prepare(`SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY ends_at ASC`)
    .all(guildId) as Giveaway[];
}

function addEntry(giveawayId: number, userId: string): boolean {
  ensureGiveawayTables();
  const db = getDb();
  const now = Date.now();

  try {
    db.prepare(`INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)`)
      .run(giveawayId, userId, now);
    return true;
  } catch {
    return false; // Already entered
  }
}

function removeEntry(giveawayId: number, userId: string): boolean {
  ensureGiveawayTables();
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?`)
    .run(giveawayId, userId);
  return result.changes > 0;
}

function getEntries(giveawayId: number): string[] {
  ensureGiveawayTables();
  const db = getDb();
  const rows = db
    .prepare(`SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`)
    .all(giveawayId) as Array<{ user_id: string }>;
  return rows.map((r) => r.user_id);
}

function getEntryCount(giveawayId: number): number {
  ensureGiveawayTables();
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?`)
    .get(giveawayId) as { count: number };
  return row.count;
}

function endGiveaway(giveawayId: number, winners: string[]): void {
  ensureGiveawayTables();
  const db = getDb();
  db.prepare(`UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?`)
    .run(JSON.stringify(winners), giveawayId);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function parseDuration(input: string): number | null {
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

  // Min 10 seconds, max 30 days
  if (ms < 10_000 || ms > 30 * 24 * 60 * 60 * 1000) return null;

  return ms;
}

function pickWinners(entries: string[], count: number): string[] {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function formatTimeLeft(endsAt: number): string {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function buildGiveawayEmbed(giveaway: Giveaway, entryCount: number): EmbedBuilder {
  const timeLeft = formatTimeLeft(giveaway.ends_at);
  const ended = giveaway.ended === 1;

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY")
    .setDescription(`**${giveaway.prize}**`)
    .setColor(ended ? 0x808080 : 0x5865f2)
    .addFields(
      { name: "Hosted by", value: `<@${giveaway.host_id}>`, inline: true },
      { name: "Winners", value: `${giveaway.winner_count}`, inline: true },
      { name: "Entries", value: `${entryCount}`, inline: true },
    )
    .setFooter({ text: ended ? "Giveaway ended" : `Ends in ${timeLeft}` })
    .setTimestamp(giveaway.ends_at);

  if (ended && giveaway.winners) {
    const winners = JSON.parse(giveaway.winners) as string[];
    if (winners.length > 0) {
      embed.addFields({
        name: "🏆 Winners",
        value: winners.map((w) => `<@${w}>`).join(", "),
        inline: false,
      });
    } else {
      embed.addFields({ name: "🏆 Winners", value: "No entries", inline: false });
    }
  }

  return embed;
}

function buildGiveawayButtons(giveawayId: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:${giveawayId}:enter`)
      .setLabel("Enter")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎉")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`giveaway:${giveawayId}:leave`)
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

/* -------------------------------------------------------------------------- */
/* Button Handler (export for interactionHandler.ts)                           */
/* -------------------------------------------------------------------------- */

export async function handleGiveawayButton(interaction: ButtonInteraction): Promise<void> {
  const [, giveawayIdStr, action] = interaction.customId.split(":");
  const giveawayId = parseInt(giveawayIdStr, 10);

  const giveaway = getGiveaway(giveawayId);

  if (!giveaway || giveaway.ended === 1) {
    await interaction.reply({ content: "This giveaway has ended!", ephemeral: true });
    return;
  }

  if (Date.now() > giveaway.ends_at) {
    await interaction.reply({ content: "This giveaway has ended!", ephemeral: true });
    return;
  }

  if (action === "enter") {
    const added = addEntry(giveawayId, interaction.user.id);
    if (added) {
      await interaction.reply({ content: "🎉 You've entered the giveaway! Good luck!", ephemeral: true });
    } else {
      await interaction.reply({ content: "You're already entered!", ephemeral: true });
    }
  } else if (action === "leave") {
    const removed = removeEntry(giveawayId, interaction.user.id);
    if (removed) {
      await interaction.reply({ content: "You've left the giveaway.", ephemeral: true });
    } else {
      await interaction.reply({ content: "You weren't entered in this giveaway.", ephemeral: true });
    }
  }

  // Update the embed with new entry count
  try {
    const entryCount = getEntryCount(giveawayId);
    const embed = buildGiveawayEmbed(giveaway, entryCount);
    await interaction.message.edit({ embeds: [embed] });
  } catch (err) {
    logger.debug({ err }, "[giveaway] failed to update embed");
  }
}

/* -------------------------------------------------------------------------- */
/* Command                                                                     */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Create and manage giveaways")
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Start a new giveaway")
      .addStringOption((o) =>
        o.setName("prize").setDescription("What are you giving away?").setRequired(true).setMaxLength(200),
      )
      .addStringOption((o) =>
        o.setName("duration").setDescription("Duration (e.g., 1h, 30m, 1d)").setRequired(true),
      )
      .addIntegerOption((o) =>
        o.setName("winners").setDescription("Number of winners (default: 1)").setMinValue(1).setMaxValue(10),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("end")
      .setDescription("End a giveaway early")
      .addStringOption((o) =>
        o.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("reroll")
      .setDescription("Reroll winners for a giveaway")
      .addStringOption((o) =>
        o.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("List active giveaways"))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  if (sub === "start") {
    const prize = interaction.options.getString("prize", true);
    const durationStr = interaction.options.getString("duration", true);
    const winnerCount = interaction.options.getInteger("winners") ?? 1;

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await interaction.editReply("Invalid duration. Use formats like: 10s, 30m, 1h, 1d (min 10s, max 30d)");
      return;
    }

    const endsAt = Date.now() + durationMs;

    const giveawayId = createGiveaway({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      hostId: interaction.user.id,
      prize,
      winnerCount,
      endsAt,
    });

    const giveaway = getGiveaway(giveawayId)!;
    const embed = buildGiveawayEmbed(giveaway, 0);
    const buttons = buildGiveawayButtons(giveawayId);

    const channel = interaction.channel as TextChannel;
    const message = await channel.send({
      embeds: [embed],
      components: [buttons],
    });

    setGiveawayMessage(giveawayId, message.id);

    await interaction.editReply(`✅ Giveaway created! ID: ${giveawayId}`);

    // Schedule auto-end
    const delay = endsAt - Date.now();
    if (delay > 0 && delay < 2147483647) {
      setTimeout(async () => {
        try {
          const g = getGiveaway(giveawayId);
          if (g && g.ended === 0) {
            const entries = getEntries(giveawayId);
            const winners = pickWinners(entries, g.winner_count);
            endGiveaway(giveawayId, winners);

            const updatedGiveaway = getGiveaway(giveawayId)!;
            const embed = buildGiveawayEmbed(updatedGiveaway, entries.length);

            await message.edit({
              embeds: [embed],
              components: [buildGiveawayButtons(giveawayId, true)],
            });

            if (winners.length > 0) {
              await channel.send(
                `🎉 Congratulations ${winners.map((w) => `<@${w}>`).join(", ")}! You won **${g.prize}**!`,
              );
            } else {
              await channel.send(`😢 No one entered the giveaway for **${g.prize}**.`);
            }
          }
        } catch (err) {
          logger.error({ err, giveawayId }, "[giveaway] auto-end failed");
        }
      }, delay);
    }

    return;
  }

  if (sub === "end") {
    const messageId = interaction.options.getString("message_id", true);
    const giveaway = getGiveawayByMessage(messageId);

    if (!giveaway || giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply("Giveaway not found.");
      return;
    }

    if (giveaway.ended === 1) {
      await interaction.editReply("This giveaway has already ended.");
      return;
    }

    const entries = getEntries(giveaway.id);
    const winners = pickWinners(entries, giveaway.winner_count);
    endGiveaway(giveaway.id, winners);

    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channel_id) as TextChannel;
      const message = await channel.messages.fetch(giveaway.message_id!);

      const updatedGiveaway = getGiveaway(giveaway.id)!;
      const embed = buildGiveawayEmbed(updatedGiveaway, entries.length);

      await message.edit({
        embeds: [embed],
        components: [buildGiveawayButtons(giveaway.id, true)],
      });

      if (winners.length > 0) {
        await channel.send(
          `🎉 Congratulations ${winners.map((w) => `<@${w}>`).join(", ")}! You won **${giveaway.prize}**!`,
        );
      }
    } catch (err) {
      logger.error({ err }, "[giveaway] failed to update message on end");
    }

    await interaction.editReply("✅ Giveaway ended!");
    return;
  }

  if (sub === "reroll") {
    const messageId = interaction.options.getString("message_id", true);
    const giveaway = getGiveawayByMessage(messageId);

    if (!giveaway || giveaway.guild_id !== interaction.guildId) {
      await interaction.editReply("Giveaway not found.");
      return;
    }

    if (giveaway.ended !== 1) {
      await interaction.editReply("This giveaway hasn't ended yet.");
      return;
    }

    const entries = getEntries(giveaway.id);
    const newWinners = pickWinners(entries, giveaway.winner_count);
    endGiveaway(giveaway.id, newWinners);

    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channel_id) as TextChannel;

      if (newWinners.length > 0) {
        await channel.send(
          `🎉 New winners: ${newWinners.map((w) => `<@${w}>`).join(", ")}! You won **${giveaway.prize}**!`,
        );
      }
    } catch (err) {
      logger.error({ err }, "[giveaway] failed to announce reroll");
    }

    await interaction.editReply("✅ Winners rerolled!");
    return;
  }

  if (sub === "list") {
    const giveaways = getActiveGiveaways(interaction.guildId);

    if (giveaways.length === 0) {
      await interaction.editReply("No active giveaways.");
      return;
    }

    const lines = giveaways.map((g) => {
      const timeLeft = formatTimeLeft(g.ends_at);
      const entryCount = getEntryCount(g.id);
      return `**${g.prize}** - ${entryCount} entries - Ends in ${timeLeft}`;
    });

    await interaction.editReply(
      ["**Active Giveaways**", "", ...lines].join("\n"),
    );
  }
}
