// src/commands/faq/faq.ts
//
// Base /faq slash command.
//
// Responsibilities:
// - Define the /faq command and subcommands (Discord API surface)
// - Own the interaction lifecycle (deferReply + final reply)
// - Route execution to subcommand handlers
//
// Non-goals:
// - No FAQ business logic (validation, persistence, permissions, filtering logic)
// - No file I/O
//
// Subcommands live in ./subcommands/*.ts and delegate to src/services/faq/*.

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

import { run as runAdd } from "./subcommands/add.js";
import { run as runGet } from "./subcommands/get.js";
import { run as runList } from "./subcommands/list.js";
import { run as runRemove } from "./subcommands/remove.js";

/**
 * Slash command definition.
 *
 * This is the public "contract" Discord registers.
 * Keep this file focused on:
 * - option names/types/descriptions
 * - routing to subcommand handlers
 */
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
          .setName("full")
          .setDescription("Show the full answer text")
          .setRequired(false),
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
        o
          .setName("query")
          .setDescription("Search in key/title/body (optional)")
          .setRequired(false),
      )
      .addStringOption((o) =>
        o
          .setName("tag")
          .setDescription("Filter by tag (optional)")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("full")
          .setDescription("Show full entries (not just a compact list)")
          .setRequired(false),
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
 * - Determine subcommand
 * - Defer reply immediately (avoids the 3s Discord timeout)
 * - Route to handler
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // Parent owns the interaction lifecycle: always defer first.
  await interaction.deferReply(
    ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
  );

  try {
    if (sub === "add") {
      await runAdd(interaction);
      return;
    }

    if (sub === "get") {
      await runGet(interaction);
      return;
    }

    if (sub === "list") {
      await runList(interaction);
      return;
    }

    if (sub === "remove") {
      await runRemove(interaction);
      return;
    }

    // Safety net in case Discord sends something unexpected
    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[faq] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}