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
import { getContextLogger } from "../../../../services/core/logging/requestContext.js";
import { sendAdminAuditLog } from "../../../../services/discord/discord/adminAudit.js";
import { t, resolveLocale } from "../../../../i18n/index.js";
import { create } from "../../../../services/integrations/faq/services.js";

import {
  guardFaqAction,
  parseTags,
  handleFaqSubcommandError,
} from "../../../../services/integrations/faq/_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!(await guardFaqAction(interaction, "add"))) return;

    const key = interaction.options.getString("key", true).trim();
    const title = interaction.options.getString("title", true).trim();
    const body = interaction.options.getString("body", true).trim();
    const tagsRaw = interaction.options.getString("tags", false);

    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    // Keep command-layer checks tiny. Service layer is strict.
    if (!key) {
      await interaction.editReply("❌ " + t("faq.key_empty", locale));
      return;
    }
    if (!title) {
      await interaction.editReply("❌ " + t("faq.title_empty", locale));
      return;
    }
    if (!body) {
      await interaction.editReply("❌ " + t("faq.body_empty", locale));
      return;
    }

    const tags = parseTags(tagsRaw);

    const entry = await create({
      key,
      title,
      body,
      tags,
      actor: interaction.user.id,
    });

    await interaction.editReply(`✅ Added FAQ **${entry.key}**`);
    await sendAdminAuditLog(
      interaction,
      [
        "📝 **FAQ added**",
        `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
        `Guild: ${interaction.guildId ?? "dm"}`,
        `Key: **${entry.key}**`,
        `Title: **${entry.title}**`,
      ].join("\n"),
    );

    getContextLogger().info(
      { userId: interaction.user.id, key: entry.key },
      "[faq/add] created",
    );
  } catch (err) {
    await handleFaqSubcommandError(interaction, err, "[faq/add] failed");
  }
}
