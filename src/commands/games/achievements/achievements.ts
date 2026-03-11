// src/commands/achievements/achievements.ts
//
// Achievement system: command definition and execution.
// Definitions in definitions.ts; embed in embedBuilder.ts.

import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../services/core/database/db.js";
import { buildAchievementsEmbed } from "./embedBuilder.js";
import { ACHIEVEMENTS, type Achievement } from "./definitions.js";

export { buildAchievementsEmbed } from "./embedBuilder.js";
export { ACHIEVEMENTS, type Achievement } from "./definitions.js";

export type Database = ReturnType<typeof getDb>;

/**
 * Returns the list of achievement IDs currently unlocked for a user.
 * Used to detect "newly unlocked" after a game action (e.g. blackjack natural).
 */
export function getUnlockedAchievementIds(userId: string, db: Database): string[] {
  return ACHIEVEMENTS.filter((a) => a.checkFn(userId, db)).map((a) => a.id);
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Call recordFn(), then return a one-line string for the first newly unlocked achievement
 * (e.g. "🃏 You unlocked: **Natural 21!**") or undefined if none.
 * Use after recording a game result so the reply can show an achievement pop.
 */
export function getNewlyUnlockedAchievementLine(
  userId: string,
  db: Database,
  recordFn: () => void,
): string | undefined {
  const before = getUnlockedAchievementIds(userId, db);
  recordFn();
  const after = getUnlockedAchievementIds(userId, db);
  const newly = after.filter((id) => !before.includes(id));
  if (newly.length === 0) return undefined;
  const a = getAchievementById(newly[0]);
  return a ? `${a.emoji} You unlocked: **${a.name}**!` : undefined;
}

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
