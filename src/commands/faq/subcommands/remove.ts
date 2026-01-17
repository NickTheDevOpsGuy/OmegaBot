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

import { logger } from "../../../utils/logger.js";
import { getByKey, remove } from "../../../services/faq/services.js";
import {
  guardFaqAction,
  readRequiredKey,
  handleFaqSubcommandError,
} from "../../../services/faq/_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Permissions only make sense in a guild context
    if (!interaction.inGuild()) {
      // Type assertion needed due to TypeScript narrowing issue
      await (interaction as ChatInputCommandInteraction).editReply("❌ `/faq remove` can only be used in a server.");
      return;
    }

    // Centralized permission gate (ManageGuild/Admin or whatever your policy is)
    if (!(await guardFaqAction(interaction, "remove"))) return;

    // Read + minimal validate key from options
    const rawKey = await readRequiredKey(interaction, "key");
    if (!rawKey) return;

    // Lookup entry (service normalizes internally too, but we keep messaging clean here)
    const existing = getByKey(rawKey);
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
  } catch (err: unknown) {
    // No `any` here. Keep the handler strict and log the raw error.
    await handleFaqSubcommandError(interaction, err, "[faq/remove] failed");
  }
}
