// src/utils/logger.ts

import pino, { type Logger } from "pino";

/**
 * Central logger for OmegaBot.
 *
 * Why a single logger module?
 * - Consistent log format across the whole app
 * - One place to change log level / destinations later
 * - Easy to swap to JSON logs in prod and pretty logs in dev
 *
 * Notes:
 * - We use `pino-pretty` only for local development readability.
 * - If `pino-pretty` is not installed, we gracefully fall back to normal JSON logs
 *   instead of crashing the bot at startup.
 */

/**
 * Determine if we should try to use pino-pretty.
 *
 * Default behavior:
 * - Development: pretty logs (if pino-pretty is installed)
 * - Production: JSON logs
 *
 * Override:
 * - Set LOG_PRETTY="false" to force JSON logs locally if you want.
 */
const isProd = process.env.NODE_ENV === "production";
const prettyEnabled =
  !isProd && (process.env.LOG_PRETTY ?? "true").toLowerCase() === "true";

/**
 * Build a configured Pino logger.
 *
 * We do this in a function so we can safely try the transport and fall back.
 */
function createLogger(): Logger {
  const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

  // Normal JSON logger (safe default everywhere).
  const base = pino({ level });

  if (!prettyEnabled) {
    return base;
  }

  /**
   * Dev pretty mode:
   * If `pino-pretty` is missing or cannot be resolved, Pino throws:
   * "unable to determine transport target for 'pino-pretty'"
   *
   * We catch that and keep running with JSON logs.
   */
  try {
    const transport = pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });

    return pino({ level }, transport);
  } catch (err) {
    // Do not crash the bot because a dev-only dependency is missing.
    // Keep output readable enough to diagnose it.
    // eslint-disable-next-line no-console
    console.warn(
      "[logger] pino-pretty not available, falling back to JSON logs. Install with: npm i -D pino-pretty",
      err,
    );
    return base;
  }
}

/**
 * Export a single logger instance for the whole project.
 *
 * Usage:
 *   import { logger } from "../utils/logger.js";
 *   logger.info("something happened");
 *   logger.error({ err }, "something failed");
 */
export const logger = createLogger();