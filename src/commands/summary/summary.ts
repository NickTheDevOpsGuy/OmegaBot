import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";

export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages and DM it to you")
  .addIntegerOption(opt =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    // FIXED: Use flags instead of ephemeral: true
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // B10: Validate channel supports messages
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support summarizing messages.");
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: count });

    if (messages.size === 0) {
      await interaction.editReply("No messages found to summarize.");
      return;
    }

    const userMessages = messages
      .filter(m => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    const text = userMessages
      .map(m => `${m.author.username}: ${m.content}`)
      .join("\n");

    const output = await summarize(text);

    if (!output || output.trim().length === 0) {
      await interaction.editReply("Summary came back empty.");
      return;
    }

    // DM-ONLY DELIVERY MODE
    if (output.length > 2000) {
      // too long; send as text file
      const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
        name: "summary.txt"
      });

      try {
        await interaction.user.send({
          content: "Here is your summary (too long to send as a message):",
          files: [file]
        });
        await interaction.editReply("Summary sent to your DMs.");
      } catch (err) {
        console.error("[summary] DM file send failed", err);
        await interaction.editReply(
          "I generated the summary, but your DMs appear to be closed."
        );
      }

      return;
    }

    // Normal-length summary, DM text
    try {
      await interaction.user.send(output);
      await interaction.editReply("Summary sent to your DMs.");
    } catch (err) {
      console.error("[summary] DM text send failed", err);
      await interaction.editReply(
        "I generated the summary, but could not DM you. Your DMs may be closed."
      );
    }
  } catch (err) {
    console.error("[summary] Summary generation failed", err);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while generating the summary."
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while generating the summary.",
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyErr) {
      console.error("[summary] Failed to send fallback error message", replyErr);
    }
  }
}