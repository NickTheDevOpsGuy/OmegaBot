// src/commands/faq/subcommands/add.ts
//
// /faq add
//
// Responsibilities:
// - Read slash command options
// - Run shared guardrails (permissions, basic input checks)
// - Delegate creation to FAQ service layer
//
// IMPORTANT:
// - This file is NOT a slash command by itself
// - It must NOT call reply() or deferReply()
// - The parent command (faq.ts) owns the interaction lifecycle

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { create } from "../../../services/faq/services.js";

import {
  guardFaqAction,
  parseTags,
  handleFaqSubcommandError,
} from "../../../services/faq/_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!(await guardFaqAction(interaction, "add"))) return;

    const key = interaction.options.getString("key", true).trim();
    const title = interaction.options.getString("title", true).trim();
    const body = interaction.options.getString("body", true).trim();
    const tagsRaw = interaction.options.getString("tags", false);

    // Keep command-layer checks tiny. Service layer is strict.
    if (!key) {
      await interaction.editReply("❌ Key cannot be empty.");
      return;
    }
    if (!title) {
      await interaction.editReply("❌ Title cannot be empty.");
      return;
    }
    if (!body) {
      await interaction.editReply("❌ Body cannot be empty.");
      return;
    }

    const tags = parseTags(tagsRaw);

    const entry = create({
      key,
      title,
      body,
      tags,
      actor: interaction.user.id,
    });

    await interaction.editReply(`✅ Added FAQ **${entry.key}**`);

    logger.info({ userId: interaction.user.id, key: entry.key }, "[faq/add] created");
  } catch (err) {
    await handleFaqSubcommandError(interaction, err, "[faq/add] failed");
  }
}
