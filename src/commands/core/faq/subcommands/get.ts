// src/commands/faq/subcommands/get.ts
//
// /faq get
//
// Responsibilities:
// - Read key
// - Fetch from service layer
// - Increment usage (optional analytics)
// - Format a clean response

import type { ChatInputCommandInteraction } from "discord.js";
import { getByKey, incrementUsage } from "../../../../services/integrations/faq/services.js";

import {
  guardFaqAction,
  readRequiredKey,
  formatFaqEntry,
  handleFaqSubcommandError,
} from "../../../../services/integrations/faq/_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!(await guardFaqAction(interaction, "get"))) return;

    const key = await readRequiredKey(interaction, "key");
    if (!key) return;

    const entry = getByKey(key);
    if (!entry) {
      await interaction.editReply(`❌ FAQ not found: **${key}**`);
      return;
    }

    // Optional analytics. If it fails, we still show the FAQ.
    try {
      incrementUsage(entry.key);
    } catch {
      // ignore
    }

    await interaction.editReply(formatFaqEntry(entry));
  } catch (err) {
    await handleFaqSubcommandError(interaction, err, "[faq/get] failed");
  }
}
