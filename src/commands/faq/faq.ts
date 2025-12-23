// src/commands/faq/faq.ts

/**
 * Base /faq slash command.
 *
 * Responsibilities of this file:
 * - Define the /faq command and its subcommands
 * - Handle the Discord interaction lifecycle (defer + reply)
 * - Route execution to the correct subcommand handler
 *
 * Non-goals (by design):
 * - No FAQ business logic
 * - No file I/O
 * - No validation or permissions
 *
 * All real work is delegated to FAQ services in src/services/faq/.
 */

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * Slash command definition.
 *
 * This defines the public Discord API shape only.
 * Each subcommand intentionally mirrors a future service operation:
 * - add    → create FAQ
 * - get    → retrieve FAQ
 * - list   → list FAQs
 * - remove → delete FAQ
 *
 * Each subcommand supports an optional ephemeral flag so users
 * can avoid spamming public channels.
 */
export const data = new SlashCommandBuilder()
  .setName("faq")
  .setDescription("FAQ commands")

  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Add a FAQ entry")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  .addSubcommand((s) =>
    s
      .setName("get")
      .setDescription("Get a FAQ entry by key")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  .addSubcommand((s) =>
    s
      .setName("list")
      .setDescription("List FAQ entries")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  .addSubcommand((s) =>
    s
      .setName("remove")
      .setDescription("Remove a FAQ entry by key")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  );

/**
 * Command execution entry point.
 *
 * Pattern used here:
 * - Determine subcommand
 * - Defer reply immediately (avoid 3s timeout)
 * - Route to the correct handler
 *
 * IMPORTANT:
 * This function intentionally contains no business logic.
 * Subcommand implementations will live in separate files/services.
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // Parent command owns the interaction lifecycle
  await interaction.deferReply(
    ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
  );

  try {
    // Placeholder routing targets.
    // Each branch will later call into faqService helpers.
    if (sub === "add") {
      await interaction.editReply("TODO: /faq add");
      return;
    }

    if (sub === "get") {
      await interaction.editReply("TODO: /faq get");
      return;
    }

    if (sub === "list") {
      await interaction.editReply("TODO: /faq list");
      return;
    }

    if (sub === "remove") {
      await interaction.editReply("TODO: /faq remove");
      return;
    }

    // Safety net in case Discord sends something unexpected
    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    // Centralized error logging, user sees generic failure
    logger.error({ err, sub }, "[faq] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}