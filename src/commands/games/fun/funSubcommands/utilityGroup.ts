// src/commands/games/fun/funSubcommands/utilityGroup.ts
// Utility subcommands for /fun (poll, weather, chat, etc.). Grouped to stay under Discord's 25-option limit.

import type { SlashCommandSubcommandGroupBuilder } from "discord.js";

export function buildUtilityGroup(
  group: SlashCommandSubcommandGroupBuilder,
): SlashCommandSubcommandGroupBuilder {
  return group
    .setName("utility")
    .setDescription("Poll, weather, chat, leaderboard, and more")
    .addSubcommand((s) =>
      s
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption((o) =>
          o.setName("question").setDescription("Poll question").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("option1").setDescription("Option 1").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("option2").setDescription("Option 2").setRequired(true),
        )
        .addStringOption((o) => o.setName("option3").setDescription("Option 3"))
        .addStringOption((o) => o.setName("option4").setDescription("Option 4")),
    )
    .addSubcommand((s) =>
      s
        .setName("weather")
        .setDescription("Current weather for a location")
        .addStringOption((o) =>
          o.setName("location").setDescription("City or ZIP").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("unit")
            .setDescription("Temperature unit")
            .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" }),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("weather7")
        .setDescription("7-day forecast for a location")
        .addStringOption((o) =>
          o.setName("location").setDescription("City or ZIP").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("unit")
            .setDescription("Temperature unit")
            .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" }),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("chat")
        .setDescription("Chat with the bot using AI (OpenAI or Claude)")
        .addStringOption((o) =>
          o
            .setName("message")
            .setDescription("What you want to say")
            .setRequired(true)
            .setMaxLength(1000),
        )
        .addBooleanOption((o) =>
          o.setName("private").setDescription("Only show the reply to you"),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("roast")
        .setDescription("Get a playful AI roast (or roast a friend)")
        .addUserOption((o) =>
          o.setName("user").setDescription("Who to roast (default: you)"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("compliment")
        .setDescription("Get a nice AI compliment (or compliment a friend)")
        .addUserOption((o) =>
          o.setName("user").setDescription("Who to compliment (default: you)"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("leaderboard")
        .setDescription("Fun command leaderboard")
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Leaderboard view")
            .addChoices(
              { name: "Users", value: "users" },
              { name: "Commands", value: "commands" },
              { name: "Single user", value: "user" },
            ),
        )
        .addUserOption((o) =>
          o.setName("user").setDescription("User for single-user view"),
        )
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Rows to show")
            .setMinValue(1)
            .setMaxValue(25),
        ),
    );
}
