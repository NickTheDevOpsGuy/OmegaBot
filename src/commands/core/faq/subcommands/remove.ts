// src/commands/faq/subcommands/remove.ts
//
// /faq remove
//
// Responsibilities:
// - Enforce permissions (via shared guard)
// - Confirm intent (button) before deleting
// - Delegate all persistence + rules to the FAQ service layer
//
// IMPORTANT:
// - This file is NOT a slash command by itself
// - It must NOT call reply() or deferReply()
// - The parent command (faq.ts) owns the interaction lifecycle

import type { ChatInputCommandInteraction, Message, ButtonInteraction } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

import { getContextLogger } from "../../../../services/core/logging/requestContext.js";
import { sendAdminAuditLog } from "../../../../services/discord/discord/adminAudit.js";
import { t, resolveLocale } from "../../../../i18n/index.js";
import { getByKey, remove } from "../../../../services/integrations/faq/services.js";
import {
  guardFaqAction,
  readRequiredKey,
  handleFaqSubcommandError,
} from "../../../../services/integrations/faq/_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Permissions only make sense in a guild context
    if (!interaction.inGuild()) {
      const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
      await (interaction as ChatInputCommandInteraction).editReply(
        "❌ " + t("faq.remove_guild_only", locale),
      );
      return;
    }

    // Centralized permission gate (ManageGuild/Admin or whatever your policy is)
    if (!(await guardFaqAction(interaction, "remove"))) return;

    // Read + minimal validate key from options
    const rawKey = await readRequiredKey(interaction, "key");
    if (!rawKey) return;

    // Lookup entry (service normalizes internally too, but we keep messaging clean here)
    const existing = await getByKey(rawKey);
    if (!existing) {
      await interaction.editReply(`❌ FAQ not found: **${rawKey}**`);
      return;
    }

    // Build a confirmation UI
    const confirmId = `faq:remove:confirm:${existing.key}:${interaction.user.id}`;
    const cancelId = `faq:remove:cancel:${existing.key}:${interaction.user.id}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary),
    );

    // Show confirmation prompt (keep it very explicit)
    const replied = (await interaction.editReply({
      content:
        `🗑️ **Confirm delete**\n` +
        `Key: **${existing.key}**\n` +
        `Title: **${existing.title}**\n\n` +
        `This cannot be undone.`,
      components: [row],
    })) as unknown as Message<true>;

    // Wait for the requester's button click
    const clicked = (await replied.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 20_000,
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
    })) as ButtonInteraction;

    // Cancel path
    if (clicked.customId === cancelId) {
      await clicked.update({
        content: "✅ Cancelled. Nothing was deleted.",
        components: [],
      });
      return;
    }

    // Confirm path
    const ok = await remove(existing.key);

    await clicked.update({
      content: ok
        ? `✅ Deleted FAQ **${existing.key}**`
        : `❌ Could not delete FAQ **${existing.key}** (it may have already been removed).`,
      components: [],
    });

    if (ok) {
      await sendAdminAuditLog(
        interaction,
        [
          "🗑️ **FAQ removed**",
          `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
          `Guild: ${interaction.guildId ?? "dm"}`,
          `Key: **${existing.key}**`,
          `Title: **${existing.title}**`,
        ].join("\n"),
      );
    }

    getContextLogger().info(
      { userId: interaction.user.id, key: existing.key },
      "[faq/remove] removed",
    );
  } catch (err: unknown) {
    await handleFaqSubcommandError(interaction, err, "[faq/remove] failed");
  }
}
