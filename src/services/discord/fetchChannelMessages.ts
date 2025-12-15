import type { TextBasedChannel, Message } from "discord.js";

export type FetchMessagesOptions = {
  count?: number;
  before?: string;
  after?: string;
};

/**
 * Fetch messages from a text-based channel with optional
 * count / before / after filters.
 *
 * Returns messages sorted oldest → newest.
 */
export async function fetchChannelMessages(
  channel: TextBasedChannel,
  options: FetchMessagesOptions = {},
): Promise<Message[]> {
  const {
    count = 50,
    before,
    after,
  } = options;

  const fetchOptions: {
    limit: number;
    before?: string;
    after?: string;
  } = {
    limit: count,
  };

  if (before) fetchOptions.before = before;
  if (after) fetchOptions.after = after;

  const collection = await channel.messages.fetch(fetchOptions);

  // Convert Collection → Array and sort chronologically
  return Array.from(collection.values()).sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp,
  );
}