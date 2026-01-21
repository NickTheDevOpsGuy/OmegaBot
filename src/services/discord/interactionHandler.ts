// src/services/discord/interactionHandler.ts
import { performance } from "node:perf_hooks";
import type { Interaction, RepliableInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { CommandModule } from "./commandTypes.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function getDiscordErrorCode(err: unknown): number | null {
  if (!isRecord(err)) return null;
  const code = err["code"];
  return typeof code === "number" ? code : null;
}

function getDiscordErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  if (isRecord(err)) {
    const msg = err["message"];
    return typeof msg === "string" ? msg : null;
  }
  return null;
}

function isDiscordUnknownInteraction(err: unknown): boolean {
  // 10062: Unknown interaction
  return getDiscordErrorCode(err) === 10062;
}

function isDiscordAlreadyAcknowledged(err: unknown): boolean {
  // 40060: Interaction has already been acknowledged
  return getDiscordErrorCode(err) === 40060;
}

function isCommandModule(cmd: unknown): cmd is CommandModule {
  return (
    isRecord(cmd) &&
    typeof cmd.execute === "function" &&
    isRecord(cmd.data) &&
    typeof (cmd.data as { name?: unknown }).name === "string"
  );
}

async function safeRepliableReply(
  interaction: RepliableInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({
        content,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
  } catch (err) {
    // Kill the log-spam classics
    if (isDiscordUnknownInteraction(err) || isDiscordAlreadyAcknowledged(err)) {
      logger.debug(
        { err, interactionId: interaction.id },
        "[interaction] reply skipped (expired/acknowledged)",
      );
      return;
    }

    logger.warn({ err, interactionId: interaction.id }, "[interaction] failed to reply");
  }
}

export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandUnknown = client.commands.get(interaction.commandName);

  if (!commandUnknown) {
    logger.warn({ command: interaction.commandName }, "[interaction] unknown command");
    return;
  }

  if (!isCommandModule(commandUnknown)) {
    logger.error(
      { command: interaction.commandName },
      "[interaction] invalid command module shape",
    );
    return;
  }

  const command = commandUnknown;
  const start = performance.now();

  try {
    await command.execute(interaction);
  } catch (err) {
    // Drop noisy cases to debug so logs stay useful
    if (isDiscordUnknownInteraction(err) || isDiscordAlreadyAcknowledged(err)) {
      logger.debug(
        { command: interaction.commandName, err },
        "[interaction] skipped (expired/acknowledged)",
      );
      return;
    }

    const code = getDiscordErrorCode(err);
    const msg = getDiscordErrorMessage(err);

    logger.error(
      { err, command: interaction.commandName, code, msg },
      "[interaction] command failed",
    );

    const hint =
      code != null ? `Discord error code: ${code}` : msg ? `Error: ${msg}` : null;

    await safeRepliableReply(
      interaction,
      hint
        ? `Something went wrong while running that command.\n${hint}`
        : "Something went wrong while running that command.",
      true,
    );
  } finally {
    const ms = Math.round(performance.now() - start);
    logger.debug(
      { command: interaction.commandName, ms },
      "[interaction] command timing",
    );
  }
}
