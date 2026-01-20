// src/commands/summary/summary.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";
import { logger } from "../../utils/logger.js";

export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages and DM it to you")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch (default 50, max 100)")
      .setMinValue(10)
      .setMaxValue(100)
      .setRequired(false),
  );

function buildTranscriptLine(args: {
  author: string;
  content: string;
  attachmentCount: number;
}): string {
  const extras: string[] = [];
  if (args.attachmentCount > 0) extras.push(`${args.attachmentCount} attachment(s)`);
  const suffix = extras.length ? ` [${extras.join(", ")}]` : "";
  return `${args.author}: ${args.content}${suffix}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support summarizing messages.");
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: count });

    const usable = messages
      .filter((m) => !m.author.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (usable.size === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    const transcript = usable
      .map((m) => {
        const content = m.content?.trim() ? m.content.trim() : "[No text content]";
        return buildTranscriptLine({
          author: m.author.username,
          content,
          attachmentCount: m.attachments.size,
        });
      })
      .join("\n");

    const output = await summarize(transcript);

    if (!output || !output.trim()) {
      await interaction.editReply("Summary came back empty.");
      return;
    }

    try {
      if (output.length > 1900) {
        const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
          name: `summary-${Date.now()}.md`,
        });

        await interaction.user.send({
          content: "Here is your summary (sent as a file):",
          files: [file],
        });
      } else {
        await interaction.user.send(output);
      }

      await interaction.editReply("✅ Summary sent to your DMs.");
    } catch (dmErr) {
      logger.warn({ dmErr, userId: interaction.user.id }, "[summary] DM failed");
      await interaction.editReply(
        "I generated the summary, but I could not DM you. Your DMs may be closed.",
      );
    }
  } catch (err) {
    logger.error({ err, command: "summary" }, "[summary] command failed");

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Something went wrong while generating the summary.");
    } else {
      await interaction.reply({
        content: "❌ Something went wrong while generating the summary.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}