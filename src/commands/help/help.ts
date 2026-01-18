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
import { logger } from "../../utils/logger.js";

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

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const isAdmin =
      interaction.inGuild() &&
      Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

    let commands: CommandListItem[] = [];
    try {
      commands = extractCommandList(interaction.client);
    } catch (err) {
      logger.error({ err }, "[help] failed to extract command list");
      commands = [];
    }

    const rawTopic = interaction.options.getString("topic") ?? "overview";

    const allowedTopics: HelpTopic[] = [
      "overview",
      "fun",
      "github",
      "summary",
      "timezone",
      "admin",
      "commands",
    ];

    const topic: HelpTopic = allowedTopics.includes(rawTopic as HelpTopic)
      ? (rawTopic as HelpTopic)
      : "overview";

    let text: string;
    try {
      text = buildHelpText({
        isAdmin,
        commands,
        topic,
      });
    } catch (err) {
      logger.error({ err, topic }, "[help] buildHelpText failed");

      text =
        "**Help is temporarily unavailable**\n\n" +
        "Something went wrong while building help text.\n" +
        "An admin has been notified via logs.\n\n" +
        "Try again in a bit.";
    }

    await interaction.reply({
      content: text,
      ephemeral: true,
    });
  } catch (err) {
    logger.error(
      { err, command: "help", userId: interaction.user.id },
      "[help] command failed",
    );

    // Absolute last-resort fallback
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Help failed unexpectedly. Please try again later.",
          ephemeral: true,
        });
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, "[help] failed to send fallback reply");
    }
  }
}
