// src/commands/achievements/achievements.ts
//
// Achievement system: command definition and execution.
// Definitions in definitions.ts; embed in embedBuilder.ts.

import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../services/database/db.js";
import { buildAchievementsEmbed } from "./embedBuilder.js";

export { buildAchievementsEmbed } from "./embedBuilder.js";
export { ACHIEVEMENTS, type Achievement } from "./definitions.js";

export const data = new SlashCommandBuilder()
  .setName("achievements")
  .setDescription("View your achievements and progress")
  .addUserOption((o) => o.setName("user").setDescription("User to view achievements for"))
  .addBooleanOption((o) => o.setName("private").setDescription("Only show to you"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const ephemeral = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply({ ephemeral });

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const db = getDb();
  const embed = buildAchievementsEmbed(targetUser, db);
  await interaction.editReply({ embeds: [embed] });
}
