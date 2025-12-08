import { SlashCommandBuilder } from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";

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

  const messages = await interaction.channel.messages.fetch({ limit: count });
  const userMessages = messages.filter(m => !m.author.bot);

  const text = userMessages
    .map(m => `${m.author.username}: ${m.content}`)
    .join("\n");

  const output = await summarize(text);

  await interaction.reply(output);
}