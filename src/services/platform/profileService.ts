// src/services/platform/profileService.ts
//
// Unified profile for Discord and web: XP, level, achievements, games, streaks.
// Resolves userId (platform or discord_id) and delegates to existing stores.

import { getDb } from "../core/database/db.js";
import { getProgression } from "../stores/progression/progressionStore.js";
import { getTotalWins, getTotalGamesPlayed } from "../stores/gameStats/gameStats.js";
import {
  getAchievementCount,
  getDailyStreak,
} from "../../commands/core/profile/profileHelpers.js";
import { getPlatformUser, resolveDiscordId } from "./userService.js";
import {
  ACHIEVEMENTS,
  getUnlockedAchievementIds,
} from "../../commands/games/achievements/achievements.js";

export type AchievementBadge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  unlocked: boolean;
};

export type Profile = {
  userId: string;
  discordId: string | null;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  achievementsEarned: number;
  achievementsTotal: number;
  achievements?: AchievementBadge[];
  dailyStreak: number;
  dailyStreakBest: number;
  dailyPoints: number;
};

/**
 * Get profile for API/Discord. userIdOrDiscordId can be platform user_id or discord_id.
 * Uses existing game/progression data keyed by discord_id.
 */
export function getProfile(userIdOrDiscordId: string): Profile | null {
  const discordId = resolveDiscordId(userIdOrDiscordId);
  if (!discordId) return null;

  const platformUser = getPlatformUser(userIdOrDiscordId) ?? getPlatformUser(discordId);
  const db = getDb();
  const progression = getProgression(discordId);
  const totalGames = getTotalGamesPlayed(db, discordId);
  const totalWins = getTotalWins(db, discordId);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const achievementsCount = getAchievementCount(db, discordId);
  const daily = getDailyStreak(db, discordId);
  const unlockedIds = new Set(getUnlockedAchievementIds(discordId, db));
  const achievements: AchievementBadge[] = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    emoji: a.emoji,
    category: a.category,
    unlocked: unlockedIds.has(a.id),
  }));

  return {
    userId: platformUser?.userId ?? discordId,
    discordId,
    username: platformUser?.username ?? discordId,
    avatarUrl: platformUser?.avatarUrl ?? null,
    xp: progression.xp,
    level: progression.level,
    gamesPlayed: totalGames,
    wins: totalWins,
    winRate,
    achievementsEarned: achievementsCount.earned,
    achievementsTotal: achievementsCount.total,
    achievements,
    dailyStreak: daily.current,
    dailyStreakBest: daily.best,
    dailyPoints: daily.points,
  };
}
