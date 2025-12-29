// src/commands/faq/subcommands/remove.ts
//
// /faq remove
//
// Responsibilities:
// - Enforce permissions (guardrails) before any destructive action
// - Confirm intent with buttons (Delete / Cancel)
// - Delegate all persistence + validation to the FAQ service layer
//
// Non-goals:
// - No file I/O
// - No schema/business rules beyond obvious UX checks
//
// IMPORTANT:
// - This file is NOT a slash command by itself
// - It must NOT call reply() or deferReply()
// - The parent command (faq.ts) owns the interaction lifecycle (deferReply/editReply)

import type { ChatInputCommandInteraction } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { canFaqAction } from "../../../services/faq/permissions.js";
import { getByKey, remove } from "../../../services/faq/services.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    /* ---------------------------------------------------------------------- */
    /* Permission + context checks (must happen first)                         */
    /* ---------------------------------------------------------------------- */

    if (!interaction.inGuild()) {
      await interaction.editReply("❌ `/faq remove` can only be used in a server.");
      return;
    }

    const perm = canFaqAction(interaction, "remove");
    if (!perm.ok) {
      await interaction.editReply(`❌ ${perm.reason}`);
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Read inputs                                                            */
    /* ---------------------------------------------------------------------- */

    const rawKey = interaction.options.getString("key", true);
    const key = rawKey.trim();

    if (key.length === 0) {
      await interaction.editReply("❌ Key cannot be empty.");
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Lookup (so we can show title and confirm what is being deleted)         */
    /* ---------------------------------------------------------------------- */

    const existing = getByKey(key);
    if (!existing) {
      await interaction.editReply(`❌ FAQ not found: **${key}**`);
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Confirmation buttons                                                   */
    /* ---------------------------------------------------------------------- */

    // Unique per interaction so old buttons cannot be replayed easily.
    const confirmId = `faq:remove:confirm:${interaction.id}`;
    const cancelId = `faq:remove:cancel:${interaction.id}`;

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

    const msg = await interaction.editReply({
      content: [
        `🗑️ **Remove FAQ?**`,
        `Key: **${existing.key}**`,
        `Title: **${existing.title}**`,
        ``,
        `This cannot be undone.`,
      ].join("\n"),
      components: [row],
    });

    // Wait for the requester to click a button. If time expires, we clean up.
    const clicked = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 20_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    if (clicked.customId === cancelId) {
      await clicked.update({
        content: "✅ Cancelled. Nothing was deleted.",
        components: [],
      });
      return;
    }

    if (clicked.customId !== confirmId) {
      await clicked.update({
        content: "❌ Unknown action.",
        components: [],
      });
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Delete                                                                 */
    /* ---------------------------------------------------------------------- */

    const ok = remove(existing.key);

    await clicked.update({
      content: ok
        ? `✅ Deleted FAQ **${existing.key}**`
        : `❌ Could not delete FAQ **${existing.key}** (it may have already been removed).`,
      components: [],
    });

    logger.info(
      { userId: interaction.user.id, key: existing.key },
      "[faq/remove] removed",
    );
  } catch (err: any) {
    // Common case: no click within timeout
    if (err?.name === "Error" && String(err?.message).includes("time")) {
      await interaction.editReply({
        content: "⌛ Timed out. Nothing was deleted.",
        components: [],
      });
      return;
    }

    logger.error({ err }, "[faq/remove] failed");
    await interaction.editReply("❌ Could not remove FAQ right now. Try again in a bit.");
  }
}
