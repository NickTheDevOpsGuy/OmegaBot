// src/commands/admin/utils.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../utils/logger.js";

export type ReplyPayload = {
  content?: string;
  embeds?: EmbedBuilder[];
  ephemeral?: boolean;
};

export async function safeReply(
  interaction: ChatInputCommandInteraction,
  payload: ReplyPayload,
): Promise<void> {
  try {
    const { content, embeds, ephemeral } = payload;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content, embeds });
      return;
    }
    await interaction.reply({
      content,
      embeds,
      ephemeral: Boolean(ephemeral),
    });
  } catch (err) {
    logger.error({ err }, "[admin] failed to reply/editReply");
  }
}

export function userFacingError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  const low = msg.toLowerCase();
  if (low.includes("missing permissions")) {
    return (
      "❌ I am missing required permissions.\n" +
      "Check my role permissions, and make sure my role is above the target user's role."
    );
  }
  if (low.includes("unknown interaction")) {
    return "❌ That took too long and Discord expired the command. Try again.";
  }
  return "❌ Command failed. Check my permissions and role position.";
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
      logger.warn(
        { err, label, attempt: i + 1, attempts, retryable },
        "[admin] operation failed",
      );
      if (!retryable || i === attempts - 1) break;
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
