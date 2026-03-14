import { getDb } from "../../core/database/db.js";
import { awardXp } from "./progressionStore.js";

type QuestTemplate = {
  id: string;
  label: string;
  target: number;
  rewardXp: number;
  progress: (userId: string, dateKey: string) => number;
};

export type DailyQuest = {
  id: string;
  label: string;
  target: number;
  current: number;
  rewardXp: number;
  completed: boolean;
  claimed: boolean;
};

export type DailyQuestBoard = {
  dateKey: string;
  quests: DailyQuest[];
  newlyClaimedXp: number;
  levelUpLines: string[];
};

function ensureQuestClaimsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_usage_daily (
      date TEXT NOT NULL,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (date, command, user_id)
    );
    CREATE TABLE IF NOT EXISTS user_quest_claims (
      date_key TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp_awarded INTEGER NOT NULL DEFAULT 0,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (date_key, quest_id, user_id)
    );
  `);
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;
}

function getTodayUserCommandPlays(
  userId: string,
  command: string,
  dateKey: string,
): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT count FROM game_usage_daily WHERE date = ? AND command = ? AND user_id = ?`,
    )
    .get(dateKey, command, userId) as { count: number } | undefined;
  return row?.count ?? 0;
}

function getTodayUserAllPlays(userId: string, dateKey: string): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT SUM(count) as total FROM game_usage_daily WHERE date = ? AND user_id = ?`,
    )
    .get(dateKey, userId) as { total: number | null };
  return row?.total ?? 0;
}

function hasCheckedInToday(userId: string, dateKey: string): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT last_checkin FROM daily_checkins WHERE user_id = ?`)
    .get(userId) as { last_checkin: number } | undefined;
  if (!row) return 0;
  const checkedInDate = new Date(row.last_checkin).toISOString().split("T")[0];
  return checkedInDate === dateKey ? 1 : 0;
}

const QUEST_POOL: QuestTemplate[] = [
  {
    id: "daily-checkin",
    label: "Check in with `/fun daily`",
    target: 1,
    rewardXp: 20,
    progress: hasCheckedInToday,
  },
  {
    id: "play-3-games",
    label: "Play 3 games today",
    target: 3,
    rewardXp: 25,
    progress: getTodayUserAllPlays,
  },
  {
    id: "trivia-2",
    label: "Play Trivia twice today",
    target: 2,
    rewardXp: 20,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "trivia", dateKey),
  },
  {
    id: "slots-3",
    label: "Spin Slots 3 times today",
    target: 3,
    rewardXp: 20,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "slots", dateKey),
  },
  {
    id: "darts-2",
    label: "Play Darts twice today",
    target: 2,
    rewardXp: 20,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "darts", dateKey),
  },
  {
    id: "blackjack-2",
    label: "Play Blackjack twice today",
    target: 2,
    rewardXp: 20,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "blackjack", dateKey),
  },
  {
    id: "wordle-1",
    label: "Play Wordle today",
    target: 1,
    rewardXp: 15,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "wordle", dateKey),
  },
  {
    id: "rps-3",
    label: "Play Rock Paper Scissors 3 times today",
    target: 3,
    rewardXp: 20,
    progress: (userId, dateKey) => getTodayUserCommandPlays(userId, "rps", dateKey),
  },
];

function pickQuestIndices(dateKey: string): number[] {
  const seed = Number(dateKey.replaceAll("-", ""));
  const size = QUEST_POOL.length;
  const first = seed % size;
  const second = (seed * 3 + 1) % size;
  const third = (seed * 7 + 2) % size;
  return [...new Set([first, second, third])];
}

function wasClaimed(userId: string, dateKey: string, questId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT 1 as claimed FROM user_quest_claims WHERE date_key = ? AND quest_id = ? AND user_id = ?`,
    )
    .get(dateKey, questId, userId) as { claimed: number } | undefined;
  return Boolean(row?.claimed);
}

export function getDailyQuestBoard(userId: string): DailyQuestBoard {
  ensureQuestClaimsTable();
  const dateKey = getTodayDateKey();
  const db = getDb();
  const levelUpLines: string[] = [];
  let newlyClaimedXp = 0;

  const quests = pickQuestIndices(dateKey).map((index) => {
    const template = QUEST_POOL[index]!;
    const current = Math.min(template.progress(userId, dateKey), template.target);
    const completed = current >= template.target;
    const claimed = wasClaimed(userId, dateKey, template.id);

    if (completed && !claimed) {
      const xpResult = awardXp(userId, template.rewardXp);
      db.prepare(
        `INSERT INTO user_quest_claims (date_key, quest_id, user_id, xp_awarded, claimed_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(dateKey, template.id, userId, template.rewardXp, Date.now());
      newlyClaimedXp += xpResult.amount;
      if (xpResult.leveledUp) {
        levelUpLines.push(`Level up! You're now level ${xpResult.after.level}.`);
      }
      return {
        id: template.id,
        label: template.label,
        target: template.target,
        current,
        rewardXp: template.rewardXp,
        completed,
        claimed: true,
      };
    }

    return {
      id: template.id,
      label: template.label,
      target: template.target,
      current,
      rewardXp: template.rewardXp,
      completed,
      claimed,
    };
  });

  return { dateKey, quests, newlyClaimedXp, levelUpLines };
}
