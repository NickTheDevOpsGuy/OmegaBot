import { getDb } from "../../core/database/db.js";
import { logger } from "../../../utils/logger.js";

export type StoredPoll = {
  version: 1;
  messageId: string;
  channelId: string;
  guildId: string | null;
  creatorUserId: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  options: string[];
  counts: number[];
  votesByUser: Record<string, number>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toPoll(row: {
  message_id: string;
  channel_id: string;
  guild_id: string | null;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
  question: string;
  options_json: string;
  counts_json: string;
  votes_json: string;
}): StoredPoll {
  return {
    version: 1,
    messageId: row.message_id,
    channelId: row.channel_id,
    guildId: row.guild_id,
    creatorUserId: row.creator_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    question: row.question,
    options: parseJson<string[]>(row.options_json, []),
    counts: parseJson<number[]>(row.counts_json, []),
    votesByUser: parseJson<Record<string, number>>(row.votes_json, {}),
  };
}

export async function createPoll(args: {
  messageId: string;
  channelId: string;
  guildId: string | null;
  creatorUserId: string;
  question: string;
  options: string[];
}): Promise<StoredPoll> {
  const createdAt = nowIso();
  const poll: StoredPoll = {
    version: 1,
    messageId: args.messageId,
    channelId: args.channelId,
    guildId: args.guildId,
    creatorUserId: args.creatorUserId,
    createdAt,
    updatedAt: createdAt,
    question: args.question,
    options: args.options,
    counts: args.options.map(() => 0),
    votesByUser: {},
  };

  try {
    getDb()
      .prepare(
        `INSERT INTO fun_polls
          (message_id, channel_id, guild_id, creator_user_id, created_at, updated_at,
           question, options_json, counts_json, votes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(message_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          guild_id = excluded.guild_id,
          creator_user_id = excluded.creator_user_id,
          updated_at = excluded.updated_at,
          question = excluded.question,
          options_json = excluded.options_json,
          counts_json = excluded.counts_json,
          votes_json = excluded.votes_json`,
      )
      .run(
        poll.messageId,
        poll.channelId,
        poll.guildId,
        poll.creatorUserId,
        poll.createdAt,
        poll.updatedAt,
        poll.question,
        JSON.stringify(poll.options),
        JSON.stringify(poll.counts),
        JSON.stringify(poll.votesByUser),
      );
  } catch (err) {
    logger.error({ err }, "[fun/pollStore] save poll threw");
  }

  return poll;
}

export async function getPoll(messageId: string): Promise<StoredPoll | null> {
  const row = getDb()
    .prepare(
      `SELECT message_id, channel_id, guild_id, creator_user_id, created_at, updated_at,
              question, options_json, counts_json, votes_json
       FROM fun_polls
       WHERE message_id = ?`,
    )
    .get(messageId) as Parameters<typeof toPoll>[0] | undefined;

  return row ? toPoll(row) : null;
}

export async function recordVote(args: {
  messageId: string;
  userId: string;
  optionIndex: number;
}): Promise<
  | { kind: "ok"; poll: StoredPoll }
  | { kind: "alreadyVoted"; previousOptionIndex: number }
  | { kind: "notFound" }
> {
  const poll = await getPoll(args.messageId);
  if (!poll) return { kind: "notFound" };

  const prev = poll.votesByUser[args.userId];
  if (typeof prev === "number" && Number.isFinite(prev)) {
    return { kind: "alreadyVoted", previousOptionIndex: prev };
  }

  poll.votesByUser[args.userId] = args.optionIndex;
  poll.counts[args.optionIndex] = (poll.counts[args.optionIndex] ?? 0) + 1;
  poll.updatedAt = nowIso();

  try {
    getDb()
      .prepare(
        `UPDATE fun_polls
         SET updated_at = ?, counts_json = ?, votes_json = ?
         WHERE message_id = ?`,
      )
      .run(
        poll.updatedAt,
        JSON.stringify(poll.counts),
        JSON.stringify(poll.votesByUser),
        poll.messageId,
      );
  } catch (err) {
    logger.error({ err }, "[fun/pollStore] save vote threw");
  }

  return { kind: "ok", poll };
}
