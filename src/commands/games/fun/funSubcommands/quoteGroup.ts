// src/commands/fun/funSubcommands/quoteGroup.ts

import type { SlashCommandSubcommandGroupBuilder } from "discord.js";

export function buildQuoteGroup(g: SlashCommandSubcommandGroupBuilder) {
  return g
    .setName("quote")
    .setDescription("Save and view memorable server quotes")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a new quote")
        .addUserOption((o) =>
          o.setName("author").setDescription("Who said it").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("text")
            .setDescription("The quote")
            .setRequired(true)
            .setMaxLength(500),
        )
        .addStringOption((o) =>
          o.setName("context").setDescription("Optional context").setMaxLength(200),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("random")
        .setDescription("Get a random quote")
        .addUserOption((o) => o.setName("author").setDescription("Filter by author")),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("List recent quotes")
        .addUserOption((o) => o.setName("author").setDescription("Filter by author"))
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Number to show (default: 25)")
            .addChoices(
              { name: "5", value: 5 },
              { name: "10", value: 10 },
              { name: "25", value: 25 },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a quote")
        .addIntegerOption((o) =>
          o
            .setName("id")
            .setDescription("Quote ID to remove")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("search")
        .setDescription("Search quotes")
        .addStringOption((o) =>
          o.setName("query").setDescription("Search text").setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Max results (default: 10)")
            .addChoices(
              { name: "5", value: 5 },
              { name: "10", value: 10 },
              { name: "25", value: 25 },
            ),
        ),
    );
}
