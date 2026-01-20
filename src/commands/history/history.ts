// src/commands/history/history.ts

import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";

export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("Get recent message history via DM")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("Number of messages to retrieve (default: 50, max: 100)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100),
  );

function formatMessageLine(args: {
  createdAt: Date;
  authorTag: string;
  content: string;
  attachmentCount: number;
  hasEmbeds: boolean;
}): string {
  const ts = args.createdAt.toLocaleString();
  const extra: string[] = [];

  if (args.attachmentCount > 0) extra.push(`${args.attachmentCount} attachment(s)`);
  if (args.hasEmbeds) extra.push("embed(s)");

  const suffix = extra.length ? ` [${extra.join(", ")}]` : "";
  return `[${ts}] ${args.authorTag}: ${args.content}${suffix}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const count = interaction.options.getInteger("count") ?? 50;

  try {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply(
        "This channel does not support reading message history.",
      );
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: count });

    if (messages.size === 0) {
      await interaction.editReply("No messages found in this channel.");
      return;
    }

    const formatted = Array.from(messages.values())
      .reverse()
      .map((msg) => {
        const content = msg.content?.trim() ? msg.content : "[No text content]";
        return formatMessageLine({
          createdAt: msg.createdAt,
          authorTag: msg.author.tag,
          content,
          attachmentCount: msg.attachments.size,
          hasEmbeds: msg.embeds.length > 0,
        });
      })
      .join("\n");

    const header = `Message History (${messages.size} messages from #${
      "name" in interaction.channel && interaction.channel.name
        ? interaction.channel.name
        : "channel"
    })`;

    try {
      const user = interaction.user;

      const asText = `**${header}**\n\n${formatted}`;
      if (asText.length <= 1900) {
        await user.send({ content: asText });
        await interaction.editReply(`✅ Sent ${messages.size} messages to your DMs.`);
        return;
      }

      const buffer = Buffer.from(`${header}\n\n${formatted}`, "utf-8");
      const attachment = new AttachmentBuilder(buffer, {
        name: `history-${Date.now()}.txt`,
      });

      await user.send({
        content: `**${header}** (sent as a file)`,
        files: [attachment],
      });

      await interaction.editReply(
        `✅ Sent ${messages.size} messages to your DMs as a file.`,
      );
    } catch (dmError) {
      logger.warn(
        { userId: interaction.user.id, err: dmError },
        "[history] could not send DM",
      );

      await interaction.editReply(
        "❌ I couldn't DM you. Enable DMs from server members and try again.",
      );
    }
  } catch (error) {
    logger.error({ error, count }, "[history] command failed");
    await interaction.editReply("❌ Failed to fetch message history. Please try again.");
  }
}