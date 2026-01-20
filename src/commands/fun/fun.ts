// src/commands/help/help.ts
import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { buildHelpText, type HelpTopic } from "../help/helpText.js";
import type { CommandClient } from "../../services/discord/commandLoader.js";
import { listCommandsForHelp } from "../../services/discord/commandMeta.js";

function getDiscordErrorCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const obj = err as Record<string, unknown>;
  const code = obj["code"];
  return typeof code === "number" ? code : null;
}

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Show help by topic")
  .addStringOption((opt) =>
    opt
      .setName("topic")
      .setDescription("Help topic")
      .setRequired(false)
      .addChoices(
        { name: "overview", value: "overview" },
        { name: "fun", value: "fun" },
        { name: "github", value: "github" },
        { name: "summary", value: "summary" },
        { name: "timezone", value: "timezone" },
        { name: "admin", value: "admin" },
        { name: "commands", value: "commands" },
      ),
  )
  .addBooleanOption((opt) =>
    opt.setName("ephemeral").setDescription("Only show help to you").setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const topic = (interaction.options.getString("topic") ?? "overview") as HelpTopic;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;

  try {
    // Defer immediately to avoid 10062 timeouts
    await interaction.deferReply(
      ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
    );

    const client = interaction.client as CommandClient;

    const isAdmin =
      interaction.inGuild() && Boolean(interaction.memberPermissions?.has("ManageGuild"));

    const commands = listCommandsForHelp(client.commands);

    const content = buildHelpText({
      isAdmin,
      commands,
      topic,
    });

    await interaction.editReply({ content });
  } catch (err) {
    logger.error(
      { err, command: "help", userId: interaction.user.id },
      "[help] command failed",
    );

    const code = getDiscordErrorCode(err);

    // If Discord says the interaction is gone, do nothing.
    if (code === 10062) return;

    // If already acknowledged, do nothing.
    if (code === 40060) return;

    // Best-effort edit if possible
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "Help failed unexpectedly. Please try again later.",
        });
      }
    } catch (err2) {
      logger.error({ err: err2 }, "[help] failed to send fallback editReply");
    }
  }
}
