// src/commands/summary/summary.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";
import { logger } from "../../utils/logger.js";

/**
 * Defines the /summary command.
 *
 * Summarizes recent messages from the current channel
 * and delivers the result privately via DM.
 */
export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages and DM it to you")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100),
  );

/**
 * Handler for the /summary command.
 *
 * Flow:
 * 1. Defer an ephemeral reply so the user sees feedback immediately.
 * 2. Validate the channel supports messages.
 * 3. Fetch and filter recent user messages.
 * 4. Build a transcript.
 * 5. Generate a summary (local or LLM).
 * 6. Deliver the result via DM (text or file).
 * 7. Handle failures gracefully.
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    /**
     * Guard: only text-capable channels can be summarized.
     */
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply(
        "This channel does not support summarizing messages.",
      );
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: count });

    if (messages.size === 0) {
      await interaction.editReply("No messages found to summarize.");
      return;
    }

    /**
     * Filter out bot messages and empty content,
     * then sort oldest → newest for readability.
     */
    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    /**
     * Build a simple transcript the summarizer can consume.
     */
    const text = userMessages
      .map((m) => `${m.author.username}: ${m.content}`)
      .join("\n");

    const output = await summarize(text);

    if (!output || output.trim().length === 0) {
      await interaction.editReply("Summary came back empty.");
      return;
    }

    /**
     * If the summary exceeds Discord message limits,
     * send it as a file attachment instead.
     */
    if (output.length > 2000) {
      const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
        name: "summary.txt",
      });

      try {
        await interaction.user.send({
          content: "Here is your summary (too long to send as a message):",
          files: [file],
        });

        await interaction.editReply("Summary sent to your DMs.");
      } catch (err) {
        logger.warn(
          { err, userId: interaction.user.id },
          "[summary] DM file send failed",
        );

        await interaction.editReply(
          "I generated the summary, but your DMs appear to be closed.",
        );
      }

      return;
    }

    /**
     * Normal-sized summary: send as plain DM text.
     */
    try {
      await interaction.user.send(output);
      await interaction.editReply("Summary sent to your DMs.");
    } catch (err) {
      logger.warn(
        { err, userId: interaction.user.id },
        "[summary] DM text send failed",
      );

      await interaction.editReply(
        "I generated the summary, but could not DM you. Your DMs may be closed.",
      );
    }
  } catch (err) {
    /**
     * Top-level failure handler.
     * We log the error and attempt to notify the user once.
     */
    logger.error(
      { err, command: "summary", userId: interaction.user.id },
      "[summary] Summary generation failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while generating the summary.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while generating the summary.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error(
        { err: replyErr },
        "[summary] Failed to send fallback error message",
      );
    }
  }
}