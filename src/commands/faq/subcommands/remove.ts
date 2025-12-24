// src/commands/faq/subcommands/remove.ts
//
// /faq remove
//
// Responsibilities:
// - Confirm intent (button) before deleting
// - Enforce basic permissions (Manage Guild or Administrator)
// - Delegate all real work to the FAQ service layer
//
// IMPORTANT:
// - This file is NOT a slash command by itself
// - It must NOT call reply() or deferReply()
// - The parent command (faq.ts) owns the interaction lifecycle

import type { ChatInputCommandInteraction } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
} from "discord.js";
import { logger } from "../../../utils/logger.js";

// NOTE: Import from the real service layer (src/services/faq/services.ts).
// This path is relative from src/commands/faq/subcommands/remove.ts

import { getByKey, remove } from "../services.js";

function canRemoveFaq(interaction: ChatInputCommandInteraction): boolean {
  // memberPermissions is the safe v14 way (avoids the string|PermissionsBitField union)
  const perms = interaction.memberPermissions;
  if (!perms) return false;

  return (
    perms.has(PermissionsBitField.Flags.ManageGuild) ||
    perms.has(PermissionsBitField.Flags.Administrator)
  );
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Permissions only make sense in a guild context.
    if (!interaction.inGuild()) {
      await interaction.editReply("❌ `/faq remove` can only be used in a server.");
      return;
    }

    if (!canRemoveFaq(interaction)) {
      await interaction.editReply("❌ You do not have permission to remove FAQs.");
      return;
    }

    const rawKey = interaction.options.getString("key", true);
    const key = rawKey.trim();

    if (key.length === 0) {
      await interaction.editReply("❌ Key cannot be empty.");
      return;
    }

    const existing = getByKey(key);
    if (!existing) {
      await interaction.editReply(`❌ FAQ not found: **${key}**`);
      return;
    }

    // Use interaction.id to keep ids unique per invocation.
    // The filter below ensures only the invoking user can click them.

    const confirmId = `faq_remove_confirm:${interaction.id}`;
    const cancelId = `faq_remove_cancel:${interaction.id}`;

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
        `🗑️ Remove FAQ **${existing.key}**?`,
        `Title: **${existing.title}**`,
        "",
        "This cannot be undone.",
      ].join("\n"),
      components: [row],
    });

    // Wait for the user to confirm or cancel.
    // If it times out, clear buttons and exit cleanly.

    let clicked;
    try {
      clicked = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 20_000,
        filter: (i) => i.user.id === interaction.user.id,
      });
    } catch {
      await interaction.editReply({
        content: "⏱️ Timed out. Nothing was deleted.",
        components: [],
      });
      return;
    }

    if (clicked.customId === cancelId) {
      await clicked.update({
        content: "✅ Cancelled. Nothing was deleted.",
        components: [],
      });
      return;
    }

    // Confirm path
    
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
  } catch (err) {
    logger.error({ err }, "[faq/remove] failed");
    await interaction.editReply("❌ Could not remove FAQ right now. Try again in a bit.");
  }
}