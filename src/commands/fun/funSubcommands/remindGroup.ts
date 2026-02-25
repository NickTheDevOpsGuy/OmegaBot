// src/commands/fun/funSubcommands/remindGroup.ts

import type { SlashCommandSubcommandGroupBuilder } from "discord.js";

export function buildRemindGroup(g: SlashCommandSubcommandGroupBuilder) {
  return g
    .setName("remind")
    .setDescription("Set and manage reminders")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Set a new reminder")
        .addStringOption((o) =>
          o
            .setName("time")
            .setDescription("When (e.g., 5m, 1h, 1d, 1h30m)")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("message")
            .setDescription("Reminder message")
            .setRequired(true)
            .setMaxLength(500),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("View your pending reminders"))
    .addSubcommand((s) =>
      s
        .setName("cancel")
        .setDescription("Cancel a reminder")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Reminder ID to cancel").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) => s.setName("clear").setDescription("Cancel all your reminders"));
}
