// src/commands/history/history.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  buildTranscript,
  type TranscriptMessage,
} from "../../services/transcript/buildTranscript.js";
import { HISTORY_DEFAULTS } from "../../services/transcript/defaults.js";
import { getUserTimezone } from "../../services/timezone/timezoneStore.js";
import { logger } from "../../utils/logger.js";

/**
 * /history command
 * Returns the last N raw user messages as a DM to the requester.
 */
export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("DMs you the most recent messages in this channel")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(5)
      .setMaxValue(50),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    // Ephemeral ack so only the caller sees status.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Guard: must be text-based to fetch messages.
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support message history.");
      return;
    }

    // Fetch recent messages
    const messages = await interaction.channel.messages.fetch({ limit: count });

    // Filter non-bot + non-empty content, then sort oldest -> newest
    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No history found.");
      return;
    }

    // Convert Discord Collection -> array in the minimal shape buildTranscript needs
    const transcriptMessages: TranscriptMessage[] = userMessages.map((m) => ({
      createdTimestamp: m.createdTimestamp,
      content: m.content,
      author: { username: m.author.username },
    }));

    // Optional per-user timezone override (fallback to defaults)
    const userTz = getUserTimezone(interaction.user.id);

    const result = buildTranscript(transcriptMessages, {
      ...HISTORY_DEFAULTS,
      timeZone: userTz ?? HISTORY_DEFAULTS.timeZone,
    });

    const text = result.text;

    // If too large for a normal DM, send as a file
    if (result.tooLong || text.length > 2000) {
      const file = new AttachmentBuilder(Buffer.from(text, "utf8"), {
        name: "history.txt",
      });

      try {
        await interaction.user.send({
          content: "Here is your recent chat history:",
          files: [file],
        });
        await interaction.editReply("History sent to your DMs.");
      } catch (err) {
        logger.warn(
          { err, userId: interaction.user.id },
          "[history] DM file send failed",
        );
        await interaction.editReply(
          "I generated the history, but your DMs appear to be closed.",
        );
      }

      return;
    }

    // Normal-length transcript -> DM as text
    try {
      await interaction.user.send(text);
      await interaction.editReply("History sent to your DMs.");
    } catch (err) {
      logger.warn(
        { err, userId: interaction.user.id },
        "[history] DM text send failed",
      );
      await interaction.editReply(
        "I generated the history, but could not DM you. Your DMs may be closed.",
      );
    }
  } catch (err) {
    logger.error(
      { err, command: "history", userId: interaction.user.id },
      "[history] command failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply("Something went wrong while fetching history.");
      } else {
        await interaction.reply({
          content: "Something went wrong while fetching history.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error(
        { err: replyErr },
        "[history] failed to send fallback error message",
      );
    }
  }
}