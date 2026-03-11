// src/commands/summarize-message/summarize-message.ts
// Context menu: Right-click message → "Summarize" (summarizes messages up to and including that one)

import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags,
  AttachmentBuilder,
  type MessageContextMenuCommandInteraction,
} from "discord.js";
import { summarize } from "../../../services/integrations/summary/summarizer.js";
import { logger } from "../../../utils/logger.js";

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

export const data = new ContextMenuCommandBuilder()
  .setName("Summarize")
  .setType(ApplicationCommandType.Message);

export async function execute(
  interaction: MessageContextMenuCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const targetMessage = interaction.targetMessage;
    const channel = interaction.channel;

    if (!channel?.isTextBased()) {
      await interaction.editReply("This channel does not support summarizing.");
      return;
    }

    // Fetch messages before and including the target (up to 50)
    const before = await channel.messages.fetch({
      limit: 49,
      before: targetMessage.id,
    });
    const all = [...before.values(), targetMessage]
      .filter((m) => !m.author.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (all.length === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    const transcript = all
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

    if (!output?.trim()) {
      await interaction.editReply("Summary came back empty.");
      return;
    }

    try {
      if (output.length > 1900) {
        const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
          name: `summary-${Date.now()}.md`,
        });
        await interaction.user.send({
          content: "Summary of messages up to the one you selected:",
          files: [file],
        });
      } else {
        await interaction.user.send(output);
      }
      await interaction.editReply("✅ Summary sent to your DMs.");
    } catch (dmErr) {
      logger.warn(
        { dmErr, userId: interaction.user.id },
        "[summarize-message] DM failed",
      );
      await interaction.editReply(
        "I generated the summary, but I could not DM you. Your DMs may be closed.",
      );
    }
  } catch (err) {
    logger.error({ err, command: "summarize-message" }, "[summarize-message] failed");
    await interaction.editReply("❌ Something went wrong while generating the summary.");
  }
}
