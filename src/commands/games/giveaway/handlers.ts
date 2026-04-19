// src/commands/giveaway/handlers.ts
// Subcommand and auto-end logic for giveaways.

import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { logger } from "../../../utils/logger.js";
import {
  createGiveaway,
  setGiveawayMessage,
  getGiveaway,
  getActiveGiveaways,
  endGiveaway,
  getEntryCount,
  selectWinners,
} from "./giveawayStore.js";
import { parseDuration, formatTimeLeft } from "./utils.js";
import { buildGiveawayEmbed, buildGiveawayButtons } from "./ui.js";

export async function handleStart(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId || !interaction.channel) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const prize = interaction.options.getString("prize", true);
  const durationStr = interaction.options.getString("duration", true);
  const winnerCount = interaction.options.getInteger("winners") ?? 1;

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    await interaction.reply({
      content:
        "Invalid duration. Use format like `10s`, `30m`, `1h`, or `1d`. Min 10s, max 30d.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

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

  const reply = await interaction.editReply({ embeds: [embed], components: [buttons] });
  setGiveawayMessage(giveawayId, reply.id);

  logger.info({ giveawayId, prize, duration: durationStr }, "[giveaway] created");

  setTimeout(() => {
    void autoEndGiveaway(giveawayId, interaction.channel as TextChannel).catch((err) => {
      logger.error({ err, giveawayId }, "[giveaway] scheduled auto-end threw");
    });
  }, durationMs);
}

export async function handleEnd(interaction: ChatInputCommandInteraction): Promise<void> {
  const giveawayId = interaction.options.getInteger("id", true);
  const giveaway = getGiveaway(giveawayId);

  if (!giveaway) {
    await interaction.reply({ content: "Giveaway not found.", ephemeral: true });
    return;
  }

  if (giveaway.ended === 1) {
    await interaction.reply({
      content: "That giveaway has already ended.",
      ephemeral: true,
    });
    return;
  }

  if (giveaway.host_id !== interaction.user.id) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "Only the host or an admin can end this giveaway.",
        ephemeral: true,
      });
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const winners = selectWinners(giveawayId, giveaway.winner_count);
  endGiveaway(giveawayId, winners);

  try {
    const channel = interaction.guild?.channels.cache.get(giveaway.channel_id) as
      | TextChannel
      | undefined;
    if (channel && giveaway.message_id) {
      const message = await channel.messages.fetch(giveaway.message_id);
      const updatedGiveaway = getGiveaway(giveawayId)!;
      const embed = buildGiveawayEmbed(updatedGiveaway, getEntryCount(giveawayId));
      await message.edit({
        embeds: [embed],
        components: [buildGiveawayButtons(giveawayId, true)],
      });
    }
  } catch (err) {
    getContextLogger().warn({ err, giveawayId }, "[giveaway] update message threw");
  }

  await interaction.editReply({
    content: `✅ Giveaway #${giveawayId} ended. Winners: ${winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "No entries"}`,
  });
}

export async function handleReroll(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const giveawayId = interaction.options.getInteger("id", true);
  const giveaway = getGiveaway(giveawayId);

  if (!giveaway) {
    await interaction.reply({ content: "Giveaway not found.", ephemeral: true });
    return;
  }

  if (giveaway.ended !== 1) {
    await interaction.reply({
      content: "That giveaway hasn't ended yet.",
      ephemeral: true,
    });
    return;
  }

  const winners = selectWinners(giveawayId, giveaway.winner_count);
  endGiveaway(giveawayId, winners);

  await interaction.reply({
    content: `🎲 Rerolled! New winners: ${winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "No entries"}`,
  });
}

export async function handleList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const active = getActiveGiveaways(interaction.guildId);

  if (active.length === 0) {
    await interaction.reply({ content: "No active giveaways.", ephemeral: true });
    return;
  }

  const lines = active.map((g) => {
    const timeLeft = formatTimeLeft(g.ends_at);
    return `**#${g.id}** - ${g.prize} (${timeLeft}, ${getEntryCount(g.id)} entries)`;
  });

  const embed = new EmbedBuilder()
    .setTitle("🎉 Active Giveaways")
    .setDescription(lines.join("\n"))
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function autoEndGiveaway(
  giveawayId: number,
  channel: TextChannel,
): Promise<void> {
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.ended === 1) return;

  const winners = selectWinners(giveawayId, giveaway.winner_count);
  endGiveaway(giveawayId, winners);

  logger.info({ giveawayId, winners }, "[giveaway] auto-ended");

  try {
    if (giveaway.message_id) {
      const message = await channel.messages.fetch(giveaway.message_id);
      const updatedGiveaway = getGiveaway(giveawayId)!;
      const embed = buildGiveawayEmbed(updatedGiveaway, getEntryCount(giveawayId));
      await message.edit({
        embeds: [embed],
        components: [buildGiveawayButtons(giveawayId, true)],
      });
    }
  } catch (err) {
    getContextLogger().warn(
      { err, giveawayId },
      "[giveaway] update message on auto-end threw",
    );
  }

  if (winners.length > 0) {
    const winnerMentions = winners.map((w) => `<@${w}>`).join(", ");
    await channel.send(
      `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
    );
  }
}
