// src/services/discord/tracedInteractionHandler.ts
import type { ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import {
  createRequestContext,
  runWithContextAsync,
  getContextLogger,
  logCheckpoint,
  getElapsedMs,
  getRequestId,
} from "../logging/requestContext.js";
import { logger } from "../../utils/logger.js";

export type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;
export type AutocompleteHandler = (interaction: AutocompleteInteraction) => Promise<void>;

/**
 * Wrap a command handler with request tracing
 * This gives you:
 * - Unique request ID (UUID) for every command invocation
 * - Automatic timing logs
 * - Context available throughout the entire call stack
 */
export function traceCommand(
  commandName: string,
  handler: CommandHandler,
): CommandHandler {
  return async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand(false);

    const ctx = createRequestContext({
      userId: interaction.user.id,
      guildId: interaction.guildId ?? undefined,
      channelId: interaction.channelId,
      command: commandName,
      subcommand: subcommand ?? undefined,
      meta: {
        interactionId: interaction.id,
        username: interaction.user.username,
      },
    });

    await runWithContextAsync(ctx, async () => {
      const log = getContextLogger();

      log.info(
        {
          phase: "start",
          interactionId: interaction.id,
          username: interaction.user.username,
        },
        `[${commandName}${subcommand ? `:${subcommand}` : ""}] started`,
      );

      try {
        logCheckpoint("handler_start");

        await handler(interaction);

        logCheckpoint("handler_complete");

        log.info(
          {
            phase: "complete",
            durationMs: getElapsedMs(),
            success: true,
          },
          `[${commandName}${subcommand ? `:${subcommand}` : ""}] completed in ${getElapsedMs()}ms`,
        );
      } catch (err) {
        logCheckpoint("handler_error");

        log.error(
          {
            phase: "error",
            err,
            durationMs: getElapsedMs(),
            success: false,
          },
          `[${commandName}${subcommand ? `:${subcommand}` : ""}] failed after ${getElapsedMs()}ms`,
        );

        throw err;
      }
    });
  };
}

/**
 * Log a database operation with timing
 */
export function traceDbOperation<T>(operation: string, fn: () => T): T {
  const requestId = getRequestId();
  const start = Date.now();

  try {
    const result = fn();
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().debug(
        { operation, durationMs: duration, phase: "db_complete" },
        `DB: ${operation} (${duration}ms)`,
      );
    } else {
      logger.debug(
        { operation, durationMs: duration },
        `DB: ${operation} (${duration}ms)`,
      );
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().error(
        { operation, durationMs: duration, err, phase: "db_error" },
        `DB: ${operation} failed (${duration}ms)`,
      );
    } else {
      logger.error(
        { operation, durationMs: duration, err },
        `DB: ${operation} failed (${duration}ms)`,
      );
    }

    throw err;
  }
}

/**
 * Log an async database operation with timing
 */
export async function traceDbOperationAsync<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const requestId = getRequestId();
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().debug(
        { operation, durationMs: duration, phase: "db_complete" },
        `DB: ${operation} (${duration}ms)`,
      );
    } else {
      logger.debug(
        { operation, durationMs: duration },
        `DB: ${operation} (${duration}ms)`,
      );
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().error(
        { operation, durationMs: duration, err, phase: "db_error" },
        `DB: ${operation} failed (${duration}ms)`,
      );
    } else {
      logger.error(
        { operation, durationMs: duration, err },
        `DB: ${operation} failed (${duration}ms)`,
      );
    }

    throw err;
  }
}

/**
 * Log an external API call with timing
 */
export async function traceApiCall<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const requestId = getRequestId();
  const start = Date.now();

  if (requestId) {
    getContextLogger().debug(
      { service, operation, phase: "api_start" },
      `API: ${service}.${operation} starting`,
    );
  }

  try {
    const result = await fn();
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().debug(
        { service, operation, durationMs: duration, phase: "api_complete" },
        `API: ${service}.${operation} (${duration}ms)`,
      );
    } else {
      logger.debug(
        { service, operation, durationMs: duration },
        `API: ${service}.${operation} (${duration}ms)`,
      );
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    if (requestId) {
      getContextLogger().error(
        { service, operation, durationMs: duration, err, phase: "api_error" },
        `API: ${service}.${operation} failed (${duration}ms)`,
      );
    } else {
      logger.error(
        { service, operation, durationMs: duration, err },
        `API: ${service}.${operation} failed (${duration}ms)`,
      );
    }

    throw err;
  }
}
