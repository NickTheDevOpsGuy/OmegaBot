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
 * - If `pino-pretty` is not installed, we gracefully fall back to JSON logs.
 */

const isProd = process.env.NODE_ENV === "production";
const prettyEnabled =
  !isProd && (process.env.LOG_PRETTY ?? "true").toLowerCase() === "true";

function createLogger(): Logger {
  const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");
  const options = {
    level,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      reason: pino.stdSerializers.err,
    },
  } as const;

  // Safe default everywhere
  const base = pino(options);

  if (!prettyEnabled) {
    return base;
  }

  try {
    const transport = pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });

    return pino(options, transport);
  } catch {
    // Dev-only dependency missing, fall back cleanly
    return base;
  }
}

export const logger = createLogger();
