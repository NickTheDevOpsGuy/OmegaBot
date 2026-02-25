// src/commands/giveaway/giveaway.ts
//
// Giveaway command handler.
// Database operations are in giveawayStore.ts.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import {
  createGiveaway,
  setGiveawayMessage,
  getGiveaway,
  getActiveGiveaways,
  getEndedGiveaways,
  endGiveaway,
  getEntryCount,
  selectWinners,
} from "./giveawayStore.js";
import { parseDuration, formatTimeLeft } from "./utils.js";
import { buildGiveawayEmbed, buildGiveawayButtons } from "./ui.js";

/* -------------------------------------------------------------------------- */
/* Command Definition                                                          */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Create and manage giveaways")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Start a new giveaway")
      .addStringOption((o) =>
        o
          .setName("prize")
          .setDescription("What are you giving away?")
          .setRequired(true)
          .setMaxLength(200),
      )
      .addStringOption((o) =>
        o
          .setName("duration")
          .setDescription("How long? (e.g., 1h, 30m, 1d)")
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName("winners")
          .setDescription("Number of winners (default 1)")
          .setMinValue(1)
          .setMaxValue(10),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("end")
      .setDescription("End a giveaway early")
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("Giveaway ID")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("reroll")
      .setDescription("Pick new winners for an ended giveaway")
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("Giveaway ID")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("List active giveaways"));

/* -------------------------------------------------------------------------- */
/* Autocomplete                                                                 */
/* -------------------------------------------------------------------------- */

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "id" || !interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const giveaways =
    sub === "end"
      ? getActiveGiveaways(interaction.guildId)
      : getEndedGiveaways(interaction.guildId);

  const needle = String(focused.value || "")
    .trim()
    .toLowerCase();
  const choices = giveaways
    .filter(
      (g) =>
        !needle ||
        String(g.id).includes(needle) ||
        g.prize.toLowerCase().includes(needle),
    )
    .slice(0, 25)
    .map((g) => ({
      name: `#${g.id}: ${g.prize.slice(0, 80)}${g.prize.length > 80 ? "…" : ""}`,
      value: g.id,
    }));

  await interaction.respond(
    choices.length ? choices : [{ name: "No giveaways found", value: 0 }],
  );
}

/* -------------------------------------------------------------------------- */
/* Command Execution                                                           */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "start") {
    await handleStart(interaction);
  } else if (sub === "end") {
    await handleEnd(interaction);
  } else if (sub === "reroll") {
    await handleReroll(interaction);
  } else if (sub === "list") {
    await handleList(interaction);
  }
}

/* -------------------------------------------------------------------------- */
/* Subcommand Handlers                                                         */
/* -------------------------------------------------------------------------- */

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
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

  // Schedule end
  setTimeout(() => {
    void autoEndGiveaway(giveawayId, interaction.channel as TextChannel);
  }, durationMs);
}

async function handleEnd(interaction: ChatInputCommandInteraction): Promise<void> {
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

  // Check permission (host or admin)
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

  // Update the original message
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
    logger.warn({ err, giveawayId }, "[giveaway] failed to update message");
  }

  await interaction.editReply({
    content: `✅ Giveaway #${giveawayId} ended. Winners: ${winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "No entries"}`,
  });
}

async function handleReroll(interaction: ChatInputCommandInteraction): Promise<void> {
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

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
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

/* -------------------------------------------------------------------------- */
/* Auto-End                                                                    */
/* -------------------------------------------------------------------------- */

async function autoEndGiveaway(giveawayId: number, channel: TextChannel): Promise<void> {
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.ended === 1) return;

  const winners = selectWinners(giveawayId, giveaway.winner_count);
  endGiveaway(giveawayId, winners);

  logger.info({ giveawayId, winners }, "[giveaway] auto-ended");

  // Update message
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
    logger.warn({ err, giveawayId }, "[giveaway] failed to update message on auto-end");
  }

  // Announce winners
  if (winners.length > 0) {
    const winnerMentions = winners.map((w) => `<@${w}>`).join(", ");
    await channel.send(
      `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
    );
  }
}

export { handleGiveawayButton } from "./buttonHandler.js";
