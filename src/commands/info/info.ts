// src/commands/info/info.ts
//
// Consolidated information command for users and servers.
//
// Subcommands:
// - /info user [@user]  - View user details, roles, permissions
// - /info server        - View server statistics; optional invite link
// - /info avatar [@user] - View user's avatar in multiple sizes
//
// Handlers live in ./handlers/*.ts

import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { handleUserInfo } from "./handlers/userInfo.js";
import { handleServerInfo } from "./handlers/serverInfo.js";
import { handleAvatar } from "./handlers/avatar.js";

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Get information about users or the server")
  .addSubcommand((s) =>
    s
      .setName("user")
      .setDescription("View information about a user")
      .addUserOption((o) => o.setName("user").setDescription("User to look up"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  .addSubcommand((s) =>
    s
      .setName("server")
      .setDescription("View information about this server")
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you"))
      .addBooleanOption((o) =>
        o
          .setName("invite")
          .setDescription("Create a 24h invite link for this channel (requires Create Invite)"),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("avatar")
      .setDescription("View a user's avatar")
      .addUserOption((o) => o.setName("user").setDescription("User to view avatar for"))
      .addIntegerOption((o) =>
        o
          .setName("size")
          .setDescription("Avatar size (default: 4096)")
          .addChoices(
            { name: "128", value: 128 },
            { name: "256", value: 256 },
            { name: "512", value: 512 },
            { name: "1024", value: 1024 },
            { name: "4096", value: 4096 },
          ),
      )
      .addStringOption((o) =>
        o
          .setName("format")
          .setDescription("Image format (default: auto)")
          .addChoices(
            { name: "PNG", value: "png" },
            { name: "JPEG", value: "jpg" },
            { name: "WebP", value: "webp" },
            { name: "GIF (animated)", value: "gif" },
          ),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const ephemeral = interaction.options.getBoolean("private") ?? true;

  await interaction.deferReply({ ephemeral });

  if (sub === "user") {
    await handleUserInfo(interaction);
  } else if (sub === "server") {
    await handleServerInfo(interaction);
  } else if (sub === "avatar") {
    await handleAvatar(interaction);
  }
}
