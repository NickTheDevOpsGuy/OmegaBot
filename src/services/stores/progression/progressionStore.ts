import { getDb } from "../../core/database/db.js";
import {
  getLevelFromXp,
  xpRequiredForLevel,
} from "./progressionMath.js";

export type Progression = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

export type AwardXpResult = {
  amount: number;
  before: Progression;
  after: Progression;
  leveledUp: boolean;
};

export function ensureProgressionTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_progression (
      user_id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

export function getProgression(userId: string): Progression {
  ensureProgressionTable();
  const db = getDb();
  const row = db
    .prepare(`SELECT xp FROM user_progression WHERE user_id = ?`)
    .get(userId) as { xp: number } | undefined;

  const xp = row?.xp ?? 0;
  const level = getLevelFromXp(xp);
  const currentLevelXpFloor = xpRequiredForLevel(level);
  const nextLevelXpFloor = xpRequiredForLevel(level + 1);

  return {
    xp,
    level,
    xpIntoLevel: xp - currentLevelXpFloor,
    xpForNextLevel: nextLevelXpFloor - currentLevelXpFloor,
  };
}

export function awardXp(userId: string, amount: number): AwardXpResult {
  ensureProgressionTable();
  const db = getDb();
  const safeAmount = Math.max(0, Math.floor(amount));
  const before = getProgression(userId);

  if (safeAmount === 0) {
    return { amount: 0, before, after: before, leveledUp: false };
  }

  const now = Date.now();
  db.prepare(
    `INSERT INTO user_progression (user_id, xp, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       xp = xp + ?,
       updated_at = ?`,
  ).run(userId, safeAmount, now, safeAmount, now);

  const after = getProgression(userId);
  return {
    amount: safeAmount,
    before,
    after,
    leveledUp: after.level > before.level,
  };
}

export {
  buildProgressBar,
  getLevelFromXp,
  xpRequiredForLevel,
} from "./progressionMath.js";
