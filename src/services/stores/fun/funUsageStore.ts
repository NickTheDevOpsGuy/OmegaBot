// src/services/fun/funUsageStore.ts
// Per-command usage counts backed by SQLite.

import { getDb } from "../../core/database/db.js";
import { logger } from "../../../utils/logger.js";

export type FunCommandKey =
  | "8ball"
  | "rps"
  | "dice"
  | "coinflip"
  | "poll"
  | "weather"
  | "weather7"
  | "leaderboard"
  | "joke"
  | "trivia"
  | "quote"
  | "daily"
  | "tictactoe"
  | "blackjack"
  | "connect4"
  | "would-you-rather"
  | "fact"
  | "hangman"
  | "wordle"
  | "slots"
  | "darts"
  | "stats"
  | "choose"
  | "chat"
  | "chess"
  | "roast"
  | "compliment"
  | "memory"
  | "higherlower"
  | "quest";

export type FunUsageSnapshot = {
  version: 1;
  initializedAt: string;
  updatedAt: string;
  totalsByUser: Record<string, number>;
  totalsByCommand: Record<FunCommandKey, number>;
  byUserByCommand: Record<string, Record<FunCommandKey, number>>;
};

const ALL_COMMANDS: FunCommandKey[] = [
  "8ball",
  "rps",
  "dice",
  "coinflip",
  "poll",
  "weather",
  "weather7",
  "leaderboard",
  "joke",
  "trivia",
  "quote",
  "daily",
  "tictactoe",
  "blackjack",
  "connect4",
  "would-you-rather",
  "fact",
  "hangman",
  "wordle",
  "slots",
  "darts",
  "stats",
  "choose",
  "chat",
  "chess",
  "roast",
  "compliment",
  "memory",
  "higherlower",
  "quest",
];

function emptyTotalsByCommand(): Record<FunCommandKey, number> {
  return Object.fromEntries(ALL_COMMANDS.map((k) => [k, 0])) as Record<
    FunCommandKey,
    number
  >;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
}): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO fun_usage (user_id, command, timestamp)
         VALUES (?, ?, ?)`,
      )
      .run(args.userId, args.command, Date.now());
  } catch (err) {
    logger.error({ err }, "[fun/usage] save fun usage threw");
  }
}

export function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  const rows = getDb()
    .prepare(
      `SELECT user_id AS userId, command, timestamp
       FROM fun_usage
       ORDER BY timestamp ASC`,
    )
    .all() as Array<{ userId: string; command: FunCommandKey; timestamp: number }>;

  const totalsByUser: Record<string, number> = {};
  const totalsByCommand = emptyTotalsByCommand();
  const byUserByCommand: Record<string, Record<FunCommandKey, number>> = {};

  for (const row of rows) {
    totalsByUser[row.userId] = (totalsByUser[row.userId] ?? 0) + 1;
    totalsByCommand[row.command] = (totalsByCommand[row.command] ?? 0) + 1;

    const userCommands = byUserByCommand[row.userId] ?? emptyTotalsByCommand();
    userCommands[row.command] = (userCommands[row.command] ?? 0) + 1;
    byUserByCommand[row.userId] = userCommands;
  }

  const now = Date.now();
  const initializedAt = rows[0]?.timestamp ? iso(rows[0].timestamp) : iso(now);
  const updatedAt = rows[rows.length - 1]?.timestamp
    ? iso(rows[rows.length - 1]!.timestamp)
    : initializedAt;

  return Promise.resolve({
    version: 1,
    initializedAt,
    updatedAt,
    totalsByUser,
    totalsByCommand,
    byUserByCommand,
  });
}
