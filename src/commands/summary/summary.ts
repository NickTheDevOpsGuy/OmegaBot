// src/commands/summary/summary.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";
import { fetchChannelMessages } from "../../services/discord/fetchChannelMessages.js";
import { buildTranscript } from "../../services/transcript/buildTranscript.js";
import { SUMMARY_DEFAULTS } from "../../services/transcript/defaults.js";

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

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const count =
    interaction.options.getInteger("count") ?? SUMMARY_DEFAULTS.maxLines ?? 50;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.editReply(
      "This channel does not support summarizing messages.",
    );
    return;
  }

  const messages = await fetchChannelMessages(interaction.channel, { count });

  if (messages.length === 0) {
    await interaction.editReply("No usable messages found to summarize.");
    return;
  }

  // Build a transcript intended for summarization (usually no timestamps).
  const transcript = buildTranscript(messages, SUMMARY_DEFAULTS);

  const output = await summarize(transcript.text);

  if (!output || output.trim().length === 0) {
    await interaction.editReply("Summary came back empty.");
    return;
  }

  // DM delivery with file fallback
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
      console.error("[summary] DM file send failed", err);
      await interaction.editReply(
        "I generated the summary, but your DMs appear to be closed.",
      );
    }
    return;
  }

  try {
    await interaction.user.send(output);
    await interaction.editReply("Summary sent to your DMs.");
  } catch (err) {
    console.error("[summary] DM text send failed", err);
    await interaction.editReply(
      "I generated the summary, but could not DM you. Your DMs may be closed.",
    );
  }
}
