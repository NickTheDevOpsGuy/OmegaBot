// src/commands/history/history.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { analyzeConversationHistory } from "../../services/claude/claudeApi.js";
import { features } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Defines the /history command.
 *
 * Fetches conversation history and provides AI-powered analysis using Claude.
 */
export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("Get conversation history with optional AI analysis")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch (10-500)")
      .setMinValue(10)
      .setMaxValue(500),
  )
  .addStringOption((opt) =>
    opt
      .setName("analysis")
      .setDescription("Type of AI analysis to perform")
      .addChoices(
        { name: "None (raw transcript)", value: "none" },
        { name: "Summary", value: "summary" },
        { name: "Insights", value: "insights" },
        { name: "Timeline", value: "timeline" },
      ),
  );

/**
 * Handler for the /history command.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 100;
  const analysisType = (interaction.options.getString("analysis") ?? "none") as
    | "none"
    | "summary"
    | "insights"
    | "timeline";

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Guard: only text-capable channels
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support message history.");
      return;
    }

    await interaction.editReply(`Fetching ${count} messages...`);

    const messages = await interaction.channel.messages.fetch({ limit: count });

    if (messages.size === 0) {
      await interaction.editReply("No messages found in this channel.");
      return;
    }

    // Filter and sort messages
    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found.");
      return;
    }

    // Build transcript with timestamps
    const transcript = Array.from(
      userMessages.map((m) => {
        const timestamp = new Date(m.createdTimestamp).toLocaleString();
        return `[${timestamp}] ${m.author.username}: ${m.content}`;
      })
    );

    let output: string;
    let filename: string;

    // If no analysis requested, just send the transcript
    if (analysisType === "none") {
      const header = `# Conversation History\n\nChannel: <#${interaction.channelId}>\nMessages: ${userMessages.size}\nExported: ${new Date().toLocaleString()}\n\n---\n\n`;
      output = header + transcript.join("\n");
      filename = `history-${Date.now()}.txt`;

      logger.info(
        {
          userId: interaction.user.id,
          channelId: interaction.channelId,
          messageCount: transcript.length,
        },
        "Exporting raw conversation history",
      );
    } else {
      // Perform AI analysis
      if (!features.claude) {
        await interaction.editReply(
          "Claude API is not configured. Can only export raw transcript without analysis.",
        );
        return;
      }

      await interaction.editReply(
        `Analyzing ${userMessages.size} messages with Claude AI (${analysisType})...`,
      );

      logger.info(
        {
          userId: interaction.user.id,
          channelId: interaction.channelId,
          messageCount: transcript.length,
          analysisType,
        },
        "Analyzing conversation history with Claude",
      );

      const result = await analyzeConversationHistory(
        transcript,
        interaction.user.id,
        analysisType,
      );

      if (!result.success) {
        await interaction.editReply(`Failed to analyze history: ${result.error}`);
        return;
      }

      const header = `# Conversation ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}\n\nChannel: <#${interaction.channelId}>\nMessages analyzed: ${userMessages.size}\nGenerated: ${new Date().toLocaleString()}\nAnalysis type: ${analysisType}\n\n---\n\n`;
      output = header + result.analysis;
      filename = `history-${analysisType}-${Date.now()}.md`;
    }

    // Always send as file (history can be long)
    const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
      name: filename,
    });

    try {
      const analysisText =
        analysisType === "none" ? "conversation history" : `${analysisType} analysis`;

      await interaction.user.send({
        content: `Here is your ${analysisText}:`,
        files: [file],
      });

      await interaction.editReply("✅ History sent to your DMs!");
    } catch (err) {
      logger.warn(
        { err, userId: interaction.user.id },
        "[history] DM send failed",
      );

      await interaction.editReply(
        "I generated the history, but couldn't send it via DM. Please check your DM settings.",
      );
    }
  } catch (err) {
    logger.error(
      { err, command: "history", userId: interaction.user.id },
      "[history] History export failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while fetching history. Please try again later.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while fetching history. Please try again later.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, "[history] Failed to send fallback error message");
    }
  }
}
