// src/services/discord/interactionHandler.ts

import type {
  ChatInputCommandInteraction,
  Interaction,
  RepliableInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { OmegaCommand } from "./commandTypes.js";

/**
 * Show raw error messages to users only in non-production.
 * You can tighten this later (e.g., allowlist your user ID, env flag, etc).
 */
const SHOW_RAW_ERRORS = process.env.NODE_ENV !== "production";

/**
 * Narrow unknown command modules into OmegaCommand.
 * This protects you from "Property execute does not exist on type unknown".
 */
function isOmegaCommand(x: unknown): x is OmegaCommand {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return typeof obj["execute"] === "function" && obj["data"] != null;
}

/**
 * Extract Discord REST error codes safely from unknown.
 * Examples:
 * - 10062 Unknown interaction
 * - 40060 Interaction has already been acknowledged
 */
function getDiscordErrorCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const obj = err as Record<string, unknown>;
  const code = obj["code"];
  return typeof code === "number" ? code : null;
}

/**
 * Convert an error into a user-facing message.
 * In dev: show the real message.
 * In prod: keep it generic (avoid leaking internals).
 */
function buildUserFacingError(err: unknown): string {
  if (!SHOW_RAW_ERRORS) {
    return "Something went wrong while running that command.";
  }

  if (err instanceof Error) {
    // Keep it compact: Discord limits message size
    const msg = err.message || String(err);
    return `❌ **Error**\n\`\`\`\n${msg}\n\`\`\``;
  }

  return `❌ **Error**\n\`\`\`\n${String(err)}\n\`\`\``;
}

/**
 * Safe reply helper that:
 * - Uses flags (not deprecated ephemeral)
 * - Avoids double-ack issues
 * - Does not throw if Discord already consumed the interaction
 */
async function safeErrorReply(
  interaction: RepliableInteraction,
  err: unknown,
): Promise<void> {
  const content = buildUserFacingError(err);

  try {
    // If already acknowledged, ONLY edit (or followUp if you prefer).
    // editReply is the least spammy.
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
      return;
    }

    // First response: ephemeral via flags
    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    });
  } catch (replyErr) {
    const code = getDiscordErrorCode(replyErr);

    // These are expected when the interaction already timed out or got ack'd elsewhere
    if (code === 10062 || code === 40060) {
      logger.warn({ code }, "Cannot reply: interaction not available/already acknowledged");
      return;
    }

    logger.warn({ replyErr, code }, "Failed to send error to user");
  }
}

/**
 * Handle Discord interactions.
 * We ONLY handle chat input slash commands here.
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  try {
    if (!interaction.isChatInputCommand()) return;

    const cmdName = interaction.commandName;
    const raw = client.commands.get(cmdName);

    if (!isOmegaCommand(raw)) {
      logger.warn({ cmdName }, "Command not found or invalid command module");

      // Best-effort message to user.
      // (If it fails due to timing, safeErrorReply will swallow known Discord codes.)
      await safeErrorReply(
        interaction,
        new Error(
          "Command not found. If this seems wrong, re-run the register script.",
        ),
      );
      return;
    }

    // The command is valid; execute it.
    await raw.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    const code = getDiscordErrorCode(err);

    logger.error({ err, code }, "Interaction handler error");

    // If the interaction is already gone or already ack'd, do nothing.
    // Prevents the 40060 spam/crash loop.
    if (code === 10062 || code === 40060) return;

    if (interaction.isRepliable()) {
      await safeErrorReply(interaction, err);
    }
  }
}