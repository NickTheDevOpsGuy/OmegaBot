// src/services/discord/fetchChannelMessages.ts

import type { Collection, Message, TextBasedChannel } from "discord.js";
import type { TranscriptMessage } from "../transcript/buildTranscript.js";

export type FetchPlaybackOptions = {
  count: number; // 1..100 for Discord fetch
  before?: string; // message id
  after?: string; // message id
};

/**
 * Fetch messages and return user messages as a simple array, oldest -> newest.
 *
 * Notes:
 * - Discord fetch supports `before` easily.
 * - `after` is supported too, but returns messages AFTER that id, still newest-first.
 * - We sort oldest->newest at the end for stable ordering.
 */
export async function fetchChannelMessages(
  channel: TextBasedChannel,
  options: FetchPlaybackOptions,
): Promise<TranscriptMessage[]> {
  const { count, before, after } = options;

  const fetched: Collection<string, Message> = await channel.messages.fetch({
    limit: count,
    before,
    after,
  });

  const arr = Array.from(fetched.values())
    .filter((m) => !m.author.bot && Boolean(m.content))
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map<TranscriptMessage>((m) => ({
      createdTimestamp: m.createdTimestamp,
      content: m.content,
      author: { username: m.author.username },
    }));

  return arr;
}
