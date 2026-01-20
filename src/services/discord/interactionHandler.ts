// src/services/discord/interactionHandler.ts

import type { Interaction, RepliableInteraction } from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { OmegaCommand } from "./commandTypes.js";

/**
 * Discord error codes we commonly want to treat as "normal noise".
 * - 10062: Unknown interaction (token expired, replied too late, or already gone)
 * - 40060: Interaction has already been acknowledged (double reply/defer race)
 */
type DiscordErrorCode = 10062 | 40060;

function getDiscordErrorCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const obj = err as Record<string, unknown>;
  const code = obj["code"];
  return typeof code === "number" ? code : null;
}

function isIgnorableDiscordInteractionError(
  code: number | null,
): code is DiscordErrorCode {
  return code === 10062 || code === 40060;
}

function isOmegaCommand(x: unknown): x is OmegaCommand {
  if (!x || typeof x !== "object") return false;

  const obj = x as Record<string, unknown>;
  const execute = obj["execute"];
  const data = obj["data"];

  return typeof execute === "function" && data != null;
}

export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  try {
    // We only handle chat input slash commands here
    if (!interaction.isChatInputCommand()) return;

    const cmdName = interaction.commandName;

    const raw = client.commands.get(cmdName);
    if (!isOmegaCommand(raw)) {
      logger.warn({ cmdName }, "Command not found or invalid command module");

      // Best-effort notify user (ephemeral)
      await safeRepliableReply(
        interaction,
        "Command not found. If this seems wrong, re-run the register script.",
        true,
      );
      return;
    }

    await raw.execute(interaction);
  } catch (err) {
    const code = getDiscordErrorCode(err);

    // These are very common and usually not actionable. Avoid log spam.
    if (isIgnorableDiscordInteractionError(code)) {
      logger.debug({ code }, "[interaction] ignored Discord interaction error");
      return;
    }

    // Anything else is worth seeing.
    logger.error({ err, code }, "Interaction handler error");

    if (interaction.isRepliable()) {
      await safeRepliableReply(
        interaction,
        "Something went wrong while running that command.",
        true,
      );
    }
  }
}

async function safeRepliableReply(
  interaction: RepliableInteraction,
  content: string,
  ephemeral: boolean,
): Promise<void> {
  try {
    const flags = ephemeral ? 64 : undefined; // 64 = MessageFlags.Ephemeral (avoid deprecated `ephemeral:`)

    // If the interaction is already acknowledged, use followUp/editReply paths.
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ...(flags ? { flags } : {}) });
      return;
    }

    await interaction.reply({ content, ...(flags ? { flags } : {}) });
  } catch (err) {
    const code = getDiscordErrorCode(err);

    // 10062: interaction is gone/expired
    if (code === 10062) {
      logger.debug({ code }, "Cannot reply: interaction is unknown/expired");
      return;
    }

    // 40060: already acknowledged (race between reply/defer paths)
    if (code === 40060) {
      logger.debug({ code }, "Cannot reply: interaction already acknowledged");
      return;
    }

    // Anything else: log and swallow so we never crash the process
    logger.warn({ err, code }, "safeRepliableReply failed (ignored)");
  }
}
