// src/commands/achievements/achievements.ts
import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("achievements")
  .setDescription("View your achievements (coming soon)")
  .addBooleanOption((o) =>
    o.setName("private").setDescription("Only show the result to you").setRequired(false),
  )
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  await interaction.editReply(
    "Achievements are not wired up yet. (Next: track wins for games like Connect 4 / TicTacToe.)",
  );
}
