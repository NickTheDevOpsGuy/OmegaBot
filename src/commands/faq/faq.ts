// src/commands/faq/faq.ts
//
// Base /faq slash command (router).
//
// Responsibilities:
// - Define the public Discord command shape (/faq + subcommands + options)
// - Own the interaction lifecycle (deferReply + editReply)
// - Route to subcommand handlers (thin controller)
//
// Non-goals:
// - No FAQ business logic
// - No file I/O
// - No persistence or validation rules beyond “required option” at the Discord level
//
// All real work is delegated to:
// - src/commands/faq/subcommands/*   (Discord-facing handlers)
// - src/services/faq/*              (business logic + persistence)

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

// Subcommand runners (each one must NOT reply/defer on its own)
import { run as runAdd } from "./subcommands/add.js";
import { run as runRemove } from "./subcommands/remove.js";
// Future:
// import { run as runGet } from "./subcommands/get.js";
// import { run as runList } from "./subcommands/list.js";

export const data = new SlashCommandBuilder()
  .setName("faq")
  .setDescription("FAQ commands")

  // /faq add
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Add a FAQ entry")
      .addStringOption((o) =>
        o.setName("key").setDescription("Unique key").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("title").setDescription("Short title").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("body").setDescription("Answer text").setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("tags")
          .setDescription("Comma-separated tags (optional)")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /faq get
  .addSubcommand((s) =>
    s
      .setName("get")
      .setDescription("Get a FAQ entry by key")
      .addStringOption((o) =>
        o.setName("key").setDescription("Key to fetch").setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /faq list
  .addSubcommand((s) =>
    s
      .setName("list")
      .setDescription("List FAQ entries")
      .addStringOption((o) =>
        o.setName("tag").setDescription("Filter by a tag (optional)").setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /faq remove
  .addSubcommand((s) =>
    s
      .setName("remove")
      .setDescription("Remove a FAQ entry by key")
      .addStringOption((o) =>
        o.setName("key").setDescription("Key to remove").setRequired(true),
      )
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
 * Pattern:
 * - Read subcommand name
 * - Defer reply immediately (avoids Discord 3s timeout)
 * - Route to subcommand handler
 *
 * IMPORTANT:
 * Subcommand handlers must only use editReply (no reply/defer).
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // Own the lifecycle here (subcommands only editReply)
  await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  try {
    if (sub === "add") {
      await runAdd(interaction);
      return;
    }

    if (sub === "remove") {
      await runRemove(interaction);
      return;
    }

    // Placeholders until you wire these up
    if (sub === "get") {
      await interaction.editReply("TODO: /faq get");
      return;
    }

    if (sub === "list") {
      await interaction.editReply("TODO: /faq list");
      return;
    }

    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[faq] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}
