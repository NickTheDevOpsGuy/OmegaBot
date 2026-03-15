// src/services/games/progressionEngine.ts
//
// Reusable progression engine for games: XP, levels, streaks, achievements, milestones, leaderboard.
// Wraps progressionStore and game feedback helpers for a consistent API.

import type {
  AwardXpResult,
  Progression,
} from "../stores/progression/progressionStore.js";
import {
  awardXp as storeAwardXp,
  getProgression,
} from "../stores/progression/progressionStore.js";

export type { AwardXpResult, Progression };

/** Award XP and return the result. Re-export of progression store for games. */
export function awardXp(userId: string, amount: number): AwardXpResult {
  return storeAwardXp(userId, amount);
}

/** Get current progression for a user. */
export function getUserProgression(userId: string): Progression {
  return getProgression(userId);
}

export type ProgressionResult = {
  xpGained: number;
  newXpTotal: number;
  level: number;
  leveledUp: boolean;
  streak?: number;
  achievementsUnlocked?: string[];
  milestonesUnlocked?: string[];
  leaderboardSummary?: string;
};

/**
 * Run a game outcome through progression: award XP and optionally build summary.
 * Games can use this for a consistent progression result shape (e.g. for rendering).
 */
export function processGameProgression(
  userId: string,
  xpAmount: number,
  _options?: {
    streak?: number;
    achievementsUnlocked?: string[];
    milestonesUnlocked?: string[];
    leaderboardSummary?: string;
  },
): ProgressionResult & { xpResult: AwardXpResult } {
  const xpResult = storeAwardXp(userId, xpAmount);
  const after = xpResult.after;
  return {
    xpGained: xpResult.amount,
    newXpTotal: after.xp,
    level: after.level,
    leveledUp: xpResult.leveledUp,
    streak: _options?.streak,
    achievementsUnlocked: _options?.achievementsUnlocked,
    milestonesUnlocked: _options?.milestonesUnlocked,
    leaderboardSummary: _options?.leaderboardSummary,
    xpResult,
  };
}
