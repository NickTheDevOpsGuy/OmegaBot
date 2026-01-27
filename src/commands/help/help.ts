// src/commands/help/help.ts
import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { buildHelpText, type HelpTopic } from "./helpText.js";
import type { CommandClient } from "../../services/discord/commandLoader.js";
import { extractCommandList } from "../../services/discord/commandMeta.js";

function getDiscordErrorCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const obj = err as Record<string, unknown>;
  const code = obj["code"];
  return typeof code === "number" ? code : null;
}

const HELP_TOPICS: HelpTopic[] = [
  "overview",
  "fun",
  "games",
  "profile",
  "github",
  "admin",
  "commands",
];

function parseHelpTopic(raw: string | null): HelpTopic {
  if (!raw) return "overview";
  return (HELP_TOPICS.includes(raw as HelpTopic) ? raw : "overview") as HelpTopic;
}

export const data = new SlashCommandBuilder()
  .setName("help")
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
    opt.setName("private").setDescription("Only show help to you").setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const startedAt = Date.now();

  // Default to ephemeral unless user explicitly sets it false
  const ephemeral = interaction.options.getBoolean("private") ?? true;
  const topic = parseHelpTopic(interaction.options.getString("topic"));

  try {
    // Defer immediately to avoid 10062 timeouts
    await interaction.deferReply(
      ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
    );

    const client = interaction.client as CommandClient;

    const isAdmin =
      interaction.inGuild() &&
      Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

    // Best-effort pull from loaded registry
    const commands = extractCommandList(client);

    const content = buildHelpText({
      isAdmin,
      commands,
      topic,
    });

    await interaction.editReply({ content });

    logger.info(
      {
        topic,
        ephemeral,
        isAdmin,
        commandCount: commands.length,
        ms: Date.now() - startedAt,
      },
      "[help] sent",
    );
  } catch (err) {
    const code = getDiscordErrorCode(err);

    // If Discord says the interaction is gone, do nothing.
    if (code === 10062) {
      logger.debug({ code }, "[help] skipped (expired interaction)");
      return;
    }

    // If already acknowledged, do nothing.
    if (code === 40060) {
      logger.debug({ code }, "[help] skipped (already acknowledged)");
      return;
    }

    logger.error(
      {
        err,
        code,
        command: "help",
        userId: interaction.user.id,
        ms: Date.now() - startedAt,
      },
      "[help] failed",
    );

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
