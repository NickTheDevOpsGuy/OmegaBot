// src/commands/help/help.ts

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { buildHelpText, type HelpTopic } from "./helpText.js";
import {
  extractCommandList,
  type CommandListItem,
} from "../../services/discord/commandMeta.js";

/**
 * /help
 *
 * Uses topics to keep output readable and under Discord limits.
 */
export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show what OmegaBot can do and how to get started")
  .addStringOption((o) =>
    o
      .setName("topic")
      .setDescription("Choose a help topic")
      .setRequired(false)
      .addChoices(
        { name: "Overview", value: "overview" },
        { name: "Fun", value: "fun" },
        { name: "GitHub", value: "github" },
        { name: "Summary", value: "summary" },
        { name: "Timezone", value: "timezone" },
        { name: "Admin", value: "admin" },
        { name: "Commands", value: "commands" },
      ),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const isAdmin =
    interaction.inGuild() &&
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

  const commands: CommandListItem[] = extractCommandList(interaction.client);

  const rawTopic = interaction.options.getString("topic") ?? "overview";

  // Keep runtime safe: only allow known topics
  const allowedTopics: HelpTopic[] = [
    "overview",
    "fun",
    "github",
    "summary",
    "timezone",
    "admin",
    "commands",
  ];

  const topic: HelpTopic = (allowedTopics.includes(rawTopic as HelpTopic)
    ? (rawTopic as HelpTopic)
    : "overview");

  // If someone requests admin help but isn't admin, still show the admin topic
  // (it will explain they need Manage Server)
  const text = buildHelpText({
    isAdmin,
    commands,
    topic,
  });

  await interaction.reply({
    content: text,
    ephemeral: true,
  });
}