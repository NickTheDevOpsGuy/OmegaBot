import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

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
  counts: number[]; // same length as options
  votesByUser: Record<string, number>; // userId -> optionIndex
};

type PollStoreFileV1 = {
  version: 1;
  updatedAt: string;
  polls: Record<string, StoredPoll>; // messageId -> poll
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "coin-store.json");

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyStore(): PollStoreFileV1 {
  return {
    version: 1,
    updatedAt: nowIso(),
    polls: {},
  };
}

async function loadStore(): Promise<PollStoreFileV1> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PollStoreFileV1> | null;

    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (parsed.version !== 1) return emptyStore();

    const polls = parsed.polls && typeof parsed.polls === "object" ? parsed.polls : {};

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
      polls: polls as Record<string, StoredPoll>,
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: PollStoreFileV1): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function createPoll(args: {
  messageId: string;
  channelId: string;
  guildId: string | null;
  creatorUserId: string;
  question: string;
  options: string[];
}): Promise<StoredPoll> {
  const store = await loadStore();

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

  store.polls[poll.messageId] = poll;
  store.updatedAt = nowIso();

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[fun/pollStore] failed to save poll store");
  }

  return poll;
}

export async function getPoll(messageId: string): Promise<StoredPoll | null> {
  const store = await loadStore();
  return store.polls[messageId] ?? null;
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
  const store = await loadStore();
  const poll = store.polls[args.messageId];

  if (!poll) return { kind: "notFound" };

  const prev = poll.votesByUser[args.userId];
  if (typeof prev === "number" && Number.isFinite(prev)) {
    return { kind: "alreadyVoted", previousOptionIndex: prev };
  }

  poll.votesByUser[args.userId] = args.optionIndex;

  const current = poll.counts[args.optionIndex] ?? 0;
  poll.counts[args.optionIndex] = current + 1;

  poll.updatedAt = nowIso();
  store.updatedAt = nowIso();
  store.polls[poll.messageId] = poll;

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[fun/pollStore] failed to save poll store");
  }

  return { kind: "ok", poll };
}
