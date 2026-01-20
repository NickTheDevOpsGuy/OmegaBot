// src/services/fun/funUsageStore.ts
import { getDb } from "../../services/database/db";

export type FunCommandKey =
  | "joke"
  | "dice"
  | "coinflip"
  | "poll"
  | "remind"
  | "weather"
  | "weather7"
  | "leaderboard";

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
  timestamp?: number;
}): Promise<void> {
  const db = getDb();
  const ts = args.timestamp ?? Date.now();

  // Table is created in db.ts (fun_usage)
  db.prepare(
    `
    INSERT INTO fun_usage (user_id, command, timestamp)
    VALUES (?, ?, ?)
  `,
  ).run(args.userId, args.command, ts);
}

export type FunUsageSnapshot = {
  totalsByCommand: Record<string, number>;
  totalsByUser: Record<string, number>;
};

export async function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  const db = getDb();

  const byCommandRows = db
    .prepare(
      `
      SELECT command, COUNT(*) as count
      FROM fun_usage
      GROUP BY command
    `,
    )
    .all() as Array<{ command: string; count: number }>;

  const byUserRows = db
    .prepare(
      `
      SELECT user_id, COUNT(*) as count
      FROM fun_usage
      GROUP BY user_id
    `,
    )
    .all() as Array<{ user_id: string; count: number }>;

  const totalsByCommand: Record<string, number> = {};
  for (const r of byCommandRows) totalsByCommand[r.command] = r.count;

  const totalsByUser: Record<string, number> = {};
  for (const r of byUserRows) totalsByUser[r.user_id] = r.count;

  return { totalsByCommand, totalsByUser };
}