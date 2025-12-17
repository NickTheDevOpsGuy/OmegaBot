// src/services/discord/fetchChannelMessages.ts

import type { TextBasedChannel, Message } from "discord.js";
import { logger } from "../../utils/logger.js";

export type FetchMessagesOptions = {
  count?: number;
  before?: string;
  after?: string;
};

/**
 * Fetch messages from a text-based Discord channel.
 *
 * Supports optional:
 * - count  → max number of messages to fetch
 * - before → message ID cursor
 * - after  → message ID cursor
 *
 * Returns messages sorted oldest → newest.
 *
 * This function performs network I/O and therefore:
 * - Wraps fetch in try/catch
 * - Logs failures with context
 */
export async function fetchChannelMessages(
  channel: TextBasedChannel,
  options: FetchMessagesOptions = {},
): Promise<Message[]> {
  const { count = 50, before, after } = options;

  const fetchOptions: {
    limit: number;
    before?: string;
    after?: string;
  } = {
    limit: count,
  };

  if (before) fetchOptions.before = before;
  if (after) fetchOptions.after = after;

  try {
    const collection = await channel.messages.fetch(fetchOptions);

    // Convert Collection → Array and sort chronologically
    return Array.from(collection.values()).sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );
  } catch (err) {
    logger.error(
      {
        err,
        channelId: channel.id,
        count,
        before,
        after,
      },
      "Failed to fetch channel messages",
    );

    /**
     * Fail safe:
     * - Return empty list instead of crashing caller
     * - Callers can decide how to handle missing messages
     */
    return [];
  }
}
