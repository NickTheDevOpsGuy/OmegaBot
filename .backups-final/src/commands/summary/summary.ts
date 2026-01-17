// src/commands/summary/summary.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { generateClaudeSummary } from "../../services/claude/claudeApi.js";
import { features } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Defines the /summary command.
 *
 * Summarizes recent messages from the current channel using Claude API
 * and delivers the result privately via DM.
 */
export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages using Claude AI and DM it to you")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch (10-200)")
      .setMinValue(10)
      .setMaxValue(200),
  );

/**
 * Handler for the /summary command.
 *
 * Flow:
 * 1. Defer an ephemeral reply so the user sees feedback immediately.
 * 2. Validate the channel supports messages.
 * 3. Fetch and filter recent user messages.
 * 4. Generate a summary using Claude API.
 * 5. Deliver the result via DM (text or file).
 * 6. Handle failures gracefully.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Check if Claude API is enabled
    if (!features.claude) {
      await interaction.editReply(
        "Claude API is not configured. Please ask an administrator to set up the ANTHROPIC_API_KEY.",
      );
      return;
    }

    // Guard: only text-capable channels can be summarized
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support summarizing messages.");
      return;
    }

    await interaction.editReply("Fetching messages...");

    const messages = await interaction.channel.messages.fetch({ limit: count });

    if (messages.size === 0) {
      await interaction.editReply("No messages found to summarize.");
      return;
    }

    // Filter out bot messages and empty content, then sort oldest → newest
    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    await interaction.editReply(
      `Analyzing ${userMessages.size} messages with Claude AI...`,
    );

    // Build a transcript with timestamps and usernames
    const transcript = Array.from(
      userMessages.map((m) => {
        const timestamp = new Date(m.createdTimestamp).toISOString();
        return `[${timestamp}] ${m.author.username}: ${m.content}`;
      })
    );

    logger.info(
      {
        userId: interaction.user.id,
        channelId: interaction.channelId,
        messageCount: transcript.length,
      },
      "Generating Claude summary",
    );

    // Generate summary using Claude API
    const result = await generateClaudeSummary(transcript, interaction.user.id);

    if (!result.success) {
      await interaction.editReply(`Failed to generate summary: ${!result.success ? result.error : "Unknown error"}`);
      return;
    }

    const summary = result.summary;

    // Add header with metadata
    const header = `# Conversation Summary\n\nChannel: <#${interaction.channelId}>\nMessages analyzed: ${userMessages.size}\nGenerated: ${new Date().toISOString()}\n\n---\n\n`;
    const fullSummary = header + summary;

    // If the summary exceeds Discord message limits, send it as a file attachment
    if (fullSummary.length > 2000) {
      const file = new AttachmentBuilder(Buffer.from(fullSummary, "utf8"), {
        name: `summary-${Date.now()}.md`,
      });

      try {
        await interaction.user.send({
          content: "Here is your conversation summary (as a file due to length):",
          files: [file],
        });

        await interaction.editReply("✅ Summary sent to your DMs!");
      } catch (err) {
        logger.warn(
          { err, userId: interaction.user.id },
          "[summary] DM file send failed",
        );

        await interaction.editReply(
          "I generated the summary, but couldn't send it via DM. Please check your DM settings.",
        );
      }

      return;
    }

    // Normal-sized summary: send as plain DM text
    try {
      await interaction.user.send(fullSummary);
      await interaction.editReply("✅ Summary sent to your DMs!");
    } catch (err) {
      logger.warn({ err, userId: interaction.user.id }, "[summary] DM text send failed");

      await interaction.editReply(
        "I generated the summary, but couldn't send it via DM. Please check your DM settings.",
      );
    }
  } catch (err) {
    logger.error(
      { err, command: "summary", userId: interaction.user.id },
      "[summary] Summary generation failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while generating the summary. Please try again later.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while generating the summary. Please try again later.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, "[summary] Failed to send fallback error message");
    }
  }
}
