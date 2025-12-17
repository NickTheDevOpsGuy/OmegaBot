// src/commands/changelog/changelog.ts

import fs from "fs";
import path from "path";
import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * /changelog command
 *
 * Shows a short preview of CHANGELOG.md from the repo root.
 * Intended as a lightweight reference, not a full file dump.
 */
export const data = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("Show a preview of CHANGELOG.md");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const filePath = path.join(process.cwd(), "CHANGELOG.md");

  if (!fs.existsSync(filePath)) {
    logger.warn({ userId: interaction.user.id }, "[changelog] CHANGELOG.md not found");

    await interaction.editReply("No CHANGELOG.md found at the repo root.");
    return;
  }

  try {
    const preview = fs.readFileSync(filePath, "utf8").split("\n").slice(0, 40).join("\n");

    await interaction.editReply(`\`\`\`md\n${preview}\n\`\`\``);

    logger.debug({ userId: interaction.user.id }, "[changelog] Preview sent");
  } catch (err) {
    logger.error(
      { err, userId: interaction.user.id },
      "[changelog] Failed to read CHANGELOG.md",
    );

    await interaction.editReply("Failed to read CHANGELOG.md.");
  }
}
