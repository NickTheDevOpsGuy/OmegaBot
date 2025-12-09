import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { summarize } from "@services/summary/summarizer.js";

export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages")
  .addIntegerOption(opt =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100)
  );

export async function execute(interaction) {
  const count = interaction.options.getInteger("count") || 50;

  await interaction.deferReply();

  const messages = await interaction.channel.messages.fetch({ limit: count });
  const userMessages = messages
    .filter(m => !m.author.bot && m.content)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  if (userMessages.size === 0) {
    return interaction.editReply("No usable messages found to summarize.");
  }

  const text = userMessages
    .map(m => `${m.author.username}: ${m.content}`)
    .join("\n");

  const output = await summarize(text);

  // File fallback for outputs over 2000 chars
  if (output.length > 2000) {
    const file = new AttachmentBuilder(Buffer.from(output), {
      name: "summary.txt"
    });
    return interaction.editReply({
      content: "Summary was too long. Uploaded as file.",
      files: [file]
    });
  }

  return interaction.editReply(output);
}