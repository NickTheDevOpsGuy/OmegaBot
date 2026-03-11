// src/commands/admin/utils.ts
import type { ChatInputCommandInteraction } from "discord.js";
import type { EmbedBuilder } from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { safeEditReply } from "../../../services/discord/discord/safeReply.js";
import { t, type Locale } from "../../../i18n/index.js";

export type ReplyPayload = {
  content?: string;
  embeds?: EmbedBuilder[];
  ephemeral?: boolean;
};

/**
 * Safely edit the deferred admin reply (content and/or embeds).
 * Admin command always defers first, so this uses the shared safeEditReply with retries.
 */
export async function safeReply(
  interaction: ChatInputCommandInteraction,
  payload: ReplyPayload,
): Promise<void> {
  const ok = await safeEditReply(
    interaction,
    {
      content: payload.content ?? undefined,
      embeds: payload.embeds ?? undefined,
    },
    "admin.safeReply",
  );
  if (!ok) {
    getContextLogger().debug("[admin] safeEditReply failed (interaction may be expired)");
  }
}

export function userFacingError(err: unknown, locale: Locale): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  const low = msg.toLowerCase();
  if (low.includes("missing permissions")) {
    return "❌ " + t("admin.missing_permissions", locale);
  }
  if (low.includes("unknown interaction")) {
    return "❌ " + t("admin.interaction_expired", locale);
  }
  return "❌ " + t("admin.command_failed", locale);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function looksRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  return (
    low.includes("sqlite_busy") ||
    low.includes("database is locked") ||
    low.includes("busy")
  );
}

export async function withRetry<T>(
  label: string,
  fn: () => T | Promise<T>,
  attempts = 3,
  baseDelayMs = 75,
): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = looksRetryable(err);
      getContextLogger().warn(
        { err, label, attempt: i + 1, attempts, retryable },
        "[admin] operation failed",
      );
      if (!retryable || i === attempts - 1) break;
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
