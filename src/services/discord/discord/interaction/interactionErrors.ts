// src/services/discord/interaction/interactionErrors.ts
//
// Discord interaction error handling.
// Uses context logger when available so requestId is included for correlation.

import { getContextLogger, getRequestId } from "../../../core/logging/requestContext.js";

/** 10062: Unknown interaction (expired/timed out) */
export const CODE_UNKNOWN_INTERACTION = 10062;

/** 10008: Unknown message (e.g. ephemeral dismissed before edit) */
export const CODE_UNKNOWN_MESSAGE = 10008;

/** 40060: Interaction already acknowledged (double reply) */
export const CODE_ALREADY_ACKNOWLEDGED = 40060;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export function getDiscordErrorCode(err: unknown): number | null {
  if (!isRecord(err)) return null;
  const code = err["code"];
  return typeof code === "number" ? code : null;
}

export function isKnownInteractionError(err: unknown): boolean {
  const code = getDiscordErrorCode(err);
  return (
    code === CODE_UNKNOWN_INTERACTION ||
    code === CODE_ALREADY_ACKNOWLEDGED ||
    code === CODE_UNKNOWN_MESSAGE
  );
}

const interactionErrorCounts: Record<string, number> = {
  unknown_interaction: 0,
  unknown_message: 0,
  already_acknowledged: 0,
};

export function getInteractionErrorCounts(): Record<string, number> {
  return { ...interactionErrorCounts };
}

export function resetInteractionErrorCounts(): void {
  interactionErrorCounts.unknown_interaction = 0;
  interactionErrorCounts.unknown_message = 0;
  interactionErrorCounts.already_acknowledged = 0;
}

export function logKnownInteractionError(
  err: unknown,
  context: string,
  meta?: Record<string, unknown>,
): void {
  const code = getDiscordErrorCode(err);
  const codeLabel =
    code === CODE_UNKNOWN_INTERACTION
      ? "unknown_interaction"
      : code === CODE_ALREADY_ACKNOWLEDGED
        ? "already_acknowledged"
        : code === CODE_UNKNOWN_MESSAGE
          ? "unknown_message"
          : String(code);

  if (codeLabel in interactionErrorCounts) {
    interactionErrorCounts[codeLabel as keyof typeof interactionErrorCounts]++;
  }

  const log = getContextLogger();
  const payload = {
    err,
    code,
    codeLabel,
    context,
    requestId: getRequestId(),
    totalThisCode:
      codeLabel in interactionErrorCounts
        ? interactionErrorCounts[codeLabel as keyof typeof interactionErrorCounts]
        : undefined,
    ...meta,
  };
  if (code === CODE_UNKNOWN_MESSAGE) {
    log.debug(
      payload,
      "[interaction] Game/msg deleted (10008), caller notifies user: %s",
      codeLabel,
    );
  } else {
    log.info(
      payload,
      "[interaction] Discord error (user may see 'failed to complete'): %s",
      codeLabel,
    );
  }
}
