// src/commands/help/help.ts

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { buildHelpText } from "./helpText.js";
import { extractCommandList, type CommandListItem } from "../../services/discord/commandMeta.js";

/**
 * /help
 *
 * MVP goal:
 * - Give users a quick “what can this bot do?”
 * - Point admins to config commands
 * - Keep output short and readable
 *
 * Enhancement:
 * - If commands are loaded on the client, we also list them (grouped).
 */
export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show what OmegaBot can do and how to get started");

export async function execute(interaction: ChatInputCommandInteraction) {
  const isAdmin =
    interaction.inGuild() &&
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

  // Try to extract a command list from the runtime-loaded command map.
  // This is optional: if your loader uses a different shape, help still works.
  const commands: CommandListItem[] = extractCommandList(interaction.client);

  const text = buildHelpText({
    isAdmin,
    commands,
  });

  await interaction.reply({
    content: text,
    ephemeral: true,
  });
}