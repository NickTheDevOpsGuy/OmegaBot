// src/commands/profile/profile.ts
//
// User profile management with stats, AFK status, and timezone.
//
// Subcommands:
// - /profile view [@user]     - View profile with game stats, achievements, daily streak
// - /profile afk [message]   - Set or clear AFK status
// - /profile timezone [zone] - Set or view timezone
//
// Subcommand handlers live in ./subcommands/*.ts

import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { run as runView } from "./subcommands/view.js";
import { run as runAfk } from "./subcommands/afk.js";
import { run as runTimezone } from "./subcommands/timezone.js";

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View and manage your profile")
  .addSubcommand((s) =>
    s
      .setName("view")
      .setDescription("View your or another user's profile")
      .addUserOption((o) => o.setName("user").setDescription("User to view"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  .addSubcommand((s) =>
    s
      .setName("afk")
      .setDescription("Set or clear your AFK status")
      .addStringOption((o) =>
        o
          .setName("message")
          .setDescription("AFK message (leave empty to clear)")
          .setMaxLength(200),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("timezone")
      .setDescription("Set or view your timezone")
      .addStringOption((o) =>
        o
          .setName("zone")
          .setDescription("IANA timezone (e.g., America/New_York, Europe/London)"),
      )
      .addUserOption((o) =>
        o.setName("user").setDescription("View another user's timezone"),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "view") {
    await runView(interaction);
    return;
  }
  if (sub === "afk") {
    await runAfk(interaction);
    return;
  }
  if (sub === "timezone") {
    await runTimezone(interaction);
    return;
  }
}
