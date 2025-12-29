// src/commands/faq/subcommands/get.ts
//
// /faq get
//
// Responsibilities:
// - Read key from slash command options
// - Fetch the FAQ entry from the service layer
// - Return a clean formatted response
// - Best-effort increment usage (does not fail the command)
//
// IMPORTANT:
// - This file is NOT a slash command by itself
// - It must NOT call reply() or deferReply()
// - The parent command (faq.ts) owns the interaction lifecycle

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getByKey, incrementUsage } from "../../../commands/faq/services.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const rawKey = interaction.options.getString("key", true);
    const key = rawKey.trim();

    if (key.length === 0) {
      await interaction.editReply("❌ Key cannot be empty.");
      return;
    }

    const entry = getByKey(key);

    if (!entry) {
      await interaction.editReply(`❌ FAQ not found: **${key}**`);
      return;
    }

    // Best-effort analytics. Never fail /faq get because of this.
    try {
      incrementUsage(entry.key);
    } catch (err) {
      logger.warn({ err, key: entry.key }, "[faq/get] incrementUsage failed");
    }

    const msg = formatFaq(entry);

    await interaction.editReply(msg);

    logger.info({ userId: interaction.user.id, key: entry.key }, "[faq/get] sent");
  } catch (err) {
    logger.error({ err }, "[faq/get] failed");
    await interaction.editReply("❌ Could not fetch FAQ right now. Try again in a bit.");
  }
}

/* -------------------------------------------------------------------------- */
/* Formatters                                                                 */
/* -------------------------------------------------------------------------- */

type FaqEntryLike = {
  key: string;
  title: string;
  body: string;
  tags?: string[];
};

function formatFaq(entry: FaqEntryLike): string {
  const lines: string[] = [];

  lines.push(`📌 **${entry.title}**`);
  lines.push(`🔑 \`${entry.key}\``);
  lines.push("");
  lines.push(entry.body);

  const tags = Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [];
  if (tags.length > 0) {
    lines.push("");
    lines.push(`🏷️ ${tags.map((t) => `\`${t}\``).join(" ")}`);
  }

  return lines.join("\n");
}
