// src/commands/faq/subcommand/add.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { create } from "../services.js";
import { MAX_KEY_LEN } from "../../../services/faq/types.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // 1) Read inputs (these must exist in faq.ts builder options)
    const rawKey = interaction.options.getString("key", true);
    const rawTitle = interaction.options.getString("title", true);
    const rawBody = interaction.options.getString("body", true);
    const rawTags = interaction.options.getString("tags", false); // optional

    // 2) Clean / normalize user input
    const key = rawKey.trim();
    const title = rawTitle.trim();
    const body = rawBody.trim();

    // 3) Validate minimal stuff here (empty, obvious length checks)
    // - disallow empty key after trim
    // - maybe guard title/body too
    // - keep it small here, deeper rules can live in services.ts
    if (key.length > MAX_KEY_LEN) {
      await interaction.editReply(`❌ Key is too long (max ${MAX_KEY_LEN} characters).`);
      return;
    }

    // 4) Parse tags (comma-separated)
    const tags =
      rawTags
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    // 5) Call service (service does normalization + persistence)
    const entry = create({
      key,
      title,
      body,
      tags,
      actor: interaction.user.id,
    });

    // 6) Reply
    await interaction.editReply(`✅ Added FAQ **${entry.key}**`);

    logger.info({ userId: interaction.user.id, key: entry.key }, "[faq/add] created");
  } catch (err) {
    logger.error({ err }, "[faq/add] failed");
    await interaction.editReply("❌ Could not add FAQ right now. Try again in a bit.");
  }
}
