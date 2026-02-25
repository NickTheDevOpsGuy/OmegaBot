// src/commands/playback/playback.ts

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { fetchChannelMessages } from "../../services/discord/fetchChannelMessages.js";
import { buildTranscript } from "../../services/transcript/buildTranscript.js";
import {
  HISTORY_DEFAULTS,
  DISCORD_SAFE_TEXT_LIMIT,
} from "../../services/transcript/defaults.js";
import { logger } from "../../utils/logger.js";
import { recordInteractionRecovery } from "../../services/metrics/server.js";

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const lines = text.split("\n");
  const chunks: string[] = [];

  let buf = "";
  for (const line of lines) {
    const next = buf.length === 0 ? line : `${buf}\n${line}`;
    if (next.length > maxChars) {
      chunks.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);

  return chunks;
}

export const data = new SlashCommandBuilder()
  .setName("playback")
  .setDescription("Page through recent messages with buttons")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100),
  )
  .addStringOption((opt) =>
    opt
      .setName("before")
      .setDescription("Message ID: show messages before this ID")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("after")
      .setDescription("Message ID: show messages after this ID")
      .setRequired(false),
  )
  .addBooleanOption((opt) =>
    opt.setName("private").setDescription("Only show playback to you").setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;
  const before = interaction.options.getString("before") ?? undefined;
  const after = interaction.options.getString("after") ?? undefined;
  const ephemeral = interaction.options.getBoolean("private") ?? true;

  try {
    await interaction.deferReply(
      ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
    );

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support playback.");
      return;
    }

    const msgs = await fetchChannelMessages(interaction.channel, {
      count,
      before,
      after,
    });

    if (msgs.length === 0) {
      await interaction.editReply("No usable messages found for playback.");
      return;
    }

    const transcript = buildTranscript(msgs, {
      ...HISTORY_DEFAULTS,
      // For pagination, do not truncate by maxChars here, we chunk instead.
      maxChars: undefined,
      maxLines: undefined,
    });

    const pages = chunkText(transcript.text, DISCORD_SAFE_TEXT_LIMIT);

    let index = 0;

    const makeRow = (i: number) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("pb_prev")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Prev")
          .setDisabled(i <= 0),
        new ButtonBuilder()
          .setCustomId("pb_next")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Next")
          .setDisabled(i >= pages.length - 1),
        new ButtonBuilder()
          .setCustomId("pb_close")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Close"),
      );

    await interaction.editReply({
      content: `Page ${index + 1}/${pages.length}\n\n${pages[index]}`,
      components: [makeRow(index)],
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      time: 5 * 60_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (btn) => {
      try {
        if (btn.customId === "pb_close") {
          collector.stop("closed");
          await btn.update({ content: "Playback closed.", components: [] });
          return;
        }

        if (btn.customId === "pb_prev") index = Math.max(0, index - 1);
        if (btn.customId === "pb_next") index = Math.min(pages.length - 1, index + 1);

        await btn.update({
          content: `Page ${index + 1}/${pages.length}\n\n${pages[index]}`,
          components: [makeRow(index)],
        });
      } catch (err) {
        recordInteractionRecovery("playback");
        logger.warn(
          { err, userId: interaction.user.id, interactionFailedRecovery: true },
          "[playback] button update failed",
        );
        if (!btn.replied && !btn.deferred) {
          await btn.deferUpdate().catch(() => {});
        }
      }
    });

    collector.on("end", async () => {
      try {
        // disable buttons after timeout
        await interaction.editReply({ components: [] });
      } catch (err) {
        // ignore
        logger.debug({ err }, "[playback] cleanup after collector end failed");
      }
    });
  } catch (err) {
    logger.error(
      { err, command: "playback", userId: interaction.user.id },
      "[playback] command failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply("Something went wrong during playback.");
      } else {
        await interaction.reply({
          content: "Something went wrong during playback.",
          ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, "[playback] failed to send fallback error message");
    }
  }
}
