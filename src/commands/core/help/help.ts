// src/commands/help/help.ts
import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { buildHelpText, type HelpTopic } from "./helpText.js";
import type { CommandClient } from "../../../services/discord/discord/commandLoader.js";
import { extractCommandList } from "../../../services/discord/discord/commandMeta.js";
import { isModerator } from "../admin/admin.js";

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
  "quotes",
  "github",
  "status",
  "admin",
  "commands",
  "changelog",
  "summary",
  "info",
  "event",
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
        { name: "Overview", value: "overview" },
        { name: "Fun commands", value: "fun" },
        { name: "Games", value: "games" },
        { name: "Profile & timezone", value: "profile" },
        { name: "Quotes", value: "quotes" },
        { name: "GitHub", value: "github" },
        { name: "Status", value: "status" },
        { name: "Admin", value: "admin" },
        { name: "Commands list", value: "commands" },
        { name: "Changelog", value: "changelog" },
        { name: "Summary & history", value: "summary" },
        { name: "Info (user, server, avatar)", value: "info" },
        { name: "Events", value: "event" },
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

    const isAdmin = await isModerator(interaction);

    // Best-effort pull from loaded registry
    const commands = extractCommandList(client);

    const content = buildHelpText({
      isAdmin,
      commands,
      topic,
    });

    await interaction.editReply({ content });

    const log = getContextLogger();
    log.info(
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
    const log = getContextLogger();

    // If Discord says the interaction is gone, do nothing.
    if (code === 10062) {
      log.debug({ code }, "[help] skipped (expired interaction)");
      return;
    }

    // If already acknowledged, do nothing.
    if (code === 40060) {
      log.debug({ code }, "[help] skipped (already acknowledged)");
      return;
    }

    log.error(
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
          content: "Help couldn't load. Try again in a moment.",
        });
      }
    } catch (err2) {
      log.error({ err: err2 }, "[help] send fallback editReply threw");
    }
  }
}
