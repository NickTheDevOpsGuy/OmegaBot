// src/utils/errors.ts
// Shared helpers for error message extraction (logs and user-facing).

const MAX_LOG_MESSAGE_LENGTH = 200;
const MAX_USER_MESSAGE_LENGTH = 100;

export function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;

  if (typeof err === "string") return new Error(err);

  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
}

/** Safe one-line summary of an error for log messages. Include in log string so "why" is visible. */
export function errMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (oneLine.length <= MAX_LOG_MESSAGE_LENGTH) return oneLine;
  return oneLine.slice(0, MAX_LOG_MESSAGE_LENGTH - 3) + "...";
}

/** Returns true if the message looks safe to show to users (no stack, no secrets). */
function isSafeToShowUser(msg: string): boolean {
  const low = msg.toLowerCase();
  if (msg.length > MAX_USER_MESSAGE_LENGTH) return false;
  if (low.includes(" at ") && (low.includes(".ts") || low.includes(".js"))) return false;
  if (low.includes("node_modules") || low.includes("stack")) return false;
  if (
    low.includes("bearer") ||
    low.includes("token") ||
    low.includes("api_key") ||
    low.includes("secret")
  )
    return false;
  if (/\d{15,}/.test(msg)) return false; // avoid exposing long IDs
  return true;
}

/**
 * User-facing reason for an error. Use in catch blocks when replying to the user.
 * Maps known patterns to clear messages; otherwise returns a safe generic or sanitized message.
 */
export function getUserFacingReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();

  if (
    low.includes("rate limit") ||
    low.includes("429") ||
    low.includes("too many requests")
  ) {
    return "You're going too fast. Wait a moment and try again.";
  }
  if (low.includes("timeout") || low.includes("etimedout") || low.includes("timed out")) {
    return "The request timed out. Try again in a moment.";
  }
  if (
    low.includes("econnrefused") ||
    low.includes("enotfound") ||
    low.includes("network") ||
    low.includes("unreachable")
  ) {
    return "The service is unreachable. Try again in a moment.";
  }
  if (low.includes("not found") || low.includes("404")) {
    return "That wasn't found. Check and try again.";
  }
  if (
    low.includes("permission") ||
    low.includes("403") ||
    low.includes("401") ||
    low.includes("forbidden")
  ) {
    return "I don't have permission to do that. Check my role and permissions.";
  }
  if (
    low.includes("sqlite_busy") ||
    low.includes("database is locked") ||
    low.includes("busy")
  ) {
    return "The bot is busy. Try again in a moment.";
  }
  if (low.includes("unknown interaction") || low.includes("10062")) {
    return "That took too long and expired. Try again.";
  }
  if (low.includes("missing permissions") || low.includes("missing access")) {
    return "I'm missing permissions for that. Check my role and channel permissions.";
  }

  if (isSafeToShowUser(msg)) {
    return `Something went wrong: ${msg}. Try again in a moment.`;
  }
  return "Something went wrong. Try again in a moment.";
}
