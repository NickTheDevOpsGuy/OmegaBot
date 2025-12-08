import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Ping test");

export async function execute(interaction) {
  await interaction.reply("Pong");
}
