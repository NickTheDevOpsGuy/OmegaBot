// src/commands/view-achievements/view-achievements.ts
// Context menu: Right-click user → "View Achievements"

import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  type UserContextMenuCommandInteraction,
} from "discord.js";
import { getDb } from "../../services/database/db.js";
import { buildAchievementsEmbed } from "../achievements/achievements.js";

export const data = new ContextMenuCommandBuilder()
  .setName("View Achievements")
  .setType(ApplicationCommandType.User);

export async function execute(interaction: UserContextMenuCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.targetUser;
  const db = getDb();
  const embed = buildAchievementsEmbed(targetUser, db);
  await interaction.editReply({ embeds: [embed] });
}
