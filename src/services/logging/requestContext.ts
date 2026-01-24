// src/services/logging/requestContext.ts
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { logger as baseLogger } from "../../utils/logger.js";

/**
 * Request context for tracing requests through the system
 */
export type RequestContext = {
  /** Unique request ID (UUID) */
  requestId: string;
  /** User ID who initiated the request */
  userId: string;
  /** Guild ID (if in a guild) */
  guildId?: string;
  /** Channel ID */
  channelId?: string;
  /** Command name */
  command?: string;
  /** Subcommand name */
  subcommand?: string;
  /** Request start time */
  startedAt: number;
  /** Additional metadata */
  meta?: Record<string, unknown>;
};

/**
 * AsyncLocalStorage for request context
 * This allows us to access the context anywhere in the call stack
 * without passing it explicitly through every function
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Create a new request context
 */
export function createRequestContext(params: {
  userId: string;
  guildId?: string;
  channelId?: string;
  command?: string;
  subcommand?: string;
  meta?: Record<string, unknown>;
}): RequestContext {
  return {
    requestId: randomUUID(),
    userId: params.userId,
    guildId: params.guildId,
    channelId: params.channelId,
    command: params.command,
    subcommand: params.subcommand,
    startedAt: Date.now(),
    meta: params.meta,
  };
}

/**
 * Run a function with a request context
 * All code executed within the callback will have access to the context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Run an async function with a request context
 */
export async function runWithContextAsync<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Get the current request context (if any)
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get the current request ID (if any)
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * Create a child logger with request context
 * This automatically includes requestId and other context in all log messages
 */
export function getContextLogger() {
  const ctx = getRequestContext();

  if (!ctx) {
    return baseLogger;
  }

  return baseLogger.child({
    requestId: ctx.requestId,
    userId: ctx.userId,
    guildId: ctx.guildId,
    command: ctx.command,
    subcommand: ctx.subcommand,
  });
}

/**
 * Log with automatic request context
 */
export const contextLogger = {
  trace: (obj: object | string, msg?: string) => {
    const log = getContextLogger();
    if (typeof obj === "string") {
      log.trace(obj);
    } else {
      log.trace(obj, msg);
    }
  },

  debug: (obj: object | string, msg?: string) => {
    const log = getContextLogger();
    if (typeof obj === "string") {
      log.debug(obj);
    } else {
      log.debug(obj, msg);
    }
  },

  info: (obj: object | string, msg?: string) => {
    const log = getContextLogger();
    if (typeof obj === "string") {
      log.info(obj);
    } else {
      log.info(obj, msg);
    }
  },

  warn: (obj: object | string, msg?: string) => {
    const log = getContextLogger();
    if (typeof obj === "string") {
      log.warn(obj);
    } else {
      log.warn(obj, msg);
    }
  },

  error: (obj: object | string, msg?: string) => {
    const log = getContextLogger();
    if (typeof obj === "string") {
      log.error(obj);
    } else {
      log.error(obj, msg);
    }
  },
};

/**
 * Calculate elapsed time from request start
 */
export function getElapsedMs(): number {
  const ctx = getRequestContext();
  if (!ctx) return 0;
  return Date.now() - ctx.startedAt;
}

/**
 * Log timing checkpoint
 */
export function logCheckpoint(name: string, meta?: Record<string, unknown>): void {
  const ctx = getRequestContext();
  if (!ctx) {
    baseLogger.debug({ checkpoint: name, ...meta }, `Checkpoint: ${name}`);
    return;
  }

  const elapsed = Date.now() - ctx.startedAt;
  getContextLogger().debug(
    {
      checkpoint: name,
      elapsedMs: elapsed,
      ...meta,
    },
    `Checkpoint: ${name} (+${elapsed}ms)`,
  );
}
