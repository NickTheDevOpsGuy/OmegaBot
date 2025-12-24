// src/commands/faq/faq.ts
//
// Base /faq slash command.
//
// Responsibilities:
// - Define the /faq command + subcommands (Discord API shape)
// - Own the interaction lifecycle (deferReply + editReply)
// - Route to subcommand handlers
//
// Non-goals:
// - No business logic (validation, storage, permissions)
// - No file I/O
//
// Subcommands live in: src/commands/faq/subcommands/

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

import { run as runAdd } from "./subcommands/add.js";

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
        o.setName("tags").setDescription("Comma-separated tags").setRequired(false),
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
        o.setName("key").setDescription("FAQ key").setRequired(true),
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
        o.setName("key").setDescription("FAQ key").setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // Parent command owns the interaction lifecycle.
  await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  try {
    if (sub === "add") {
      await runAdd(interaction);
      return;
    }

    // Placeholders for upcoming tickets
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

    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[faq] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}
