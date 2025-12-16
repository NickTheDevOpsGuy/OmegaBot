// src/commands/history/history.ts

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { fetchChannelMessages } from "../../services/discord/fetchChannelMessages.js";
import { buildTranscript } from "../../services/transcript/buildTranscript.js";
import { HISTORY_DEFAULTS } from "../../services/transcript/defaults.js";

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

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count =
    interaction.options.getInteger("count") ?? HISTORY_DEFAULTS.maxLines ?? 50;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.editReply("This channel does not support message history.");
    return;
  }

  const messages = await fetchChannelMessages(interaction.channel, { count });

  if (messages.length === 0) {
    await interaction.editReply("No history found.");
    return;
  }

  const transcript = buildTranscript(messages, HISTORY_DEFAULTS);

  const text = transcript.text;

  if (text.length > 2000) {
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
      console.error("[history] DM file send failed", err);
      await interaction.editReply(
        "I generated the history, but your DMs appear to be closed.",
      );
    }
    return;
  }

  try {
    await interaction.user.send(text);
    await interaction.editReply("History sent to your DMs.");
  } catch (err) {
    console.error("[history] DM text send failed", err);
    await interaction.editReply(
      "I generated the history, but could not DM you. Your DMs may be closed.",
    );
  }
}
