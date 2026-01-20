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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getDiscordErrorCode(err: unknown): number | null {
  if (!isRecord(err)) return null;
  const code = err["code"];
  return typeof code === "number" ? code : null;
}

function isOmegaCommand(x: unknown): x is OmegaCommand {
  if (!isRecord(x)) return false;
  const execute = x["execute"];
  const data = x["data"];
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
      await safeRepliableReply(
        interaction,
        "Command not found. If this seems wrong, re-run the register script.",
        { ephemeral: true },
      );
      return;
    }

    await raw.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    logger.error({ err }, "Interaction handler error");

    // Never let error handling crash the bot
    try {
      if (interaction.isRepliable()) {
        await safeRepliableReply(
          interaction,
          "Something went wrong while running that command.",
          { ephemeral: true },
        );
      }
    } catch (replyErr) {
      const code = getDiscordErrorCode(replyErr);
      logger.warn({ replyErr, code }, "Failed to send error reply (ignored)");
    }
  }
}

async function safeRepliableReply(
  interaction: RepliableInteraction,
  content: string,
  opts: { ephemeral: boolean },
): Promise<void> {
  const flags = opts.ephemeral ? MessageFlags.Ephemeral : undefined;

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content,
        ...(flags ? { flags } : {}),
      });
      return;
    }

    await interaction.reply({
      content,
      ...(flags ? { flags } : {}),
    });
  } catch (err) {
    const code = getDiscordErrorCode(err);

    // 10062: Unknown interaction (expired / invalid token)
    if (code === 10062) {
      logger.warn({ code }, "Cannot reply: interaction is unknown/expired");
      return;
    }

    // 40060: already acknowledged (race between reply/defer paths)
    if (code === 40060) {
      logger.warn({ code }, "Cannot reply: interaction already acknowledged");
      return;
    }

    // Anything else: log and swallow so we never crash the process
    logger.warn({ err, code }, "safeRepliableReply failed (ignored)");
  }
}
