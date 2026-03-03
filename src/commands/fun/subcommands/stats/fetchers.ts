// src/commands/fun/subcommands/stats/fetchers.ts
// Fetch per-game stats from DB for /fun stats.

import { getDb, getRow } from "../../../../services/database/db.js";

function safeQuery<T>(query: () => T | undefined): T | null {
  try {
    return query() ?? null;
  } catch {
    return null;
  }
}

export type RPSRow = { wins: number; losses: number; ties: number };
export type TriviaRow = {
  correct: number;
  incorrect: number;
  points: number;
  best_streak: number;
};
export type DailyRow = {
  streak: number;
  best_streak: number;
  total_checkins: number;
  points: number;
};
export type TTTRow = { wins: number; losses: number; ties: number };
export type BlackjackRow = { wins: number; losses: number; ties: number; blackjacks: number };
export type HangmanRow = { wins: number; losses: number; total_guesses: number };
export type WordleRow = {
  played: number;
  won: number;
  current_streak: number;
  max_streak: number;
};
export type SlotsRow = { spins: number; wins: number; jackpots: number };
export type DartsRow = { throws: number; best_round: number; count_180: number };
export type DartsPvpRow = { wins: number; losses: number; ties: number };
export type CoinRow = { heads: number; tails: number };

export function getRPSStats(db: ReturnType<typeof getDb>, userId: string): RPSRow | null {
  return safeQuery(() =>
    getRow<RPSRow>(
      db.prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`),
      userId,
    ),
  );
}

export function getTriviaStats(db: ReturnType<typeof getDb>, userId: string): TriviaRow | null {
  return safeQuery(() =>
    getRow<TriviaRow>(
      db.prepare(
        `SELECT correct, incorrect, points, best_streak FROM trivia_stats WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getDailyStats(db: ReturnType<typeof getDb>, userId: string): DailyRow | null {
  return safeQuery(() =>
    getRow<DailyRow>(
      db.prepare(
        `SELECT streak, best_streak, total_checkins, points FROM daily_checkins WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getTTTStats(db: ReturnType<typeof getDb>, userId: string): TTTRow | null {
  return safeQuery(() =>
    getRow<TTTRow>(
      db.prepare(`SELECT wins, losses, ties FROM ttt_stats WHERE user_id = ?`),
      userId,
    ),
  );
}

export function getBlackjackStats(
  db: ReturnType<typeof getDb>,
  userId: string,
): BlackjackRow | null {
  return safeQuery(() =>
    getRow<BlackjackRow>(
      db.prepare(
        `SELECT wins, losses, ties, blackjacks FROM blackjack_stats WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getHangmanStats(
  db: ReturnType<typeof getDb>,
  userId: string,
): HangmanRow | null {
  return safeQuery(() =>
    getRow<HangmanRow>(
      db.prepare(
        `SELECT wins, losses, total_guesses FROM hangman_stats WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getWordleStats(db: ReturnType<typeof getDb>, userId: string): WordleRow | null {
  return safeQuery(() =>
    getRow<WordleRow>(
      db.prepare(
        `SELECT played, won, current_streak, max_streak FROM wordle_stats WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getSlotsStats(db: ReturnType<typeof getDb>, userId: string): SlotsRow | null {
  return safeQuery(() =>
    getRow<SlotsRow>(
      db.prepare(`SELECT spins, wins, jackpots FROM slots_stats WHERE user_id = ?`),
      userId,
    ),
  );
}

export function getDartsStats(db: ReturnType<typeof getDb>, userId: string): DartsRow | null {
  return safeQuery(() =>
    getRow<DartsRow>(
      db.prepare(
        `SELECT throws, best_round, count_180 FROM darts_stats WHERE user_id = ?`,
      ),
      userId,
    ),
  );
}

export function getDartsPvpStats(
  db: ReturnType<typeof getDb>,
  userId: string,
): DartsPvpRow | null {
  return safeQuery(() =>
    getRow<DartsPvpRow>(
      db.prepare(`SELECT wins, losses, ties FROM darts_pvp_stats WHERE user_id = ?`),
      userId,
    ),
  );
}

type CountRow = { count: number };

export function getCoinStats(db: ReturnType<typeof getDb>, userId: string): CoinRow | null {
  return safeQuery(() => {
    const heads = getRow<CountRow>(
      db.prepare(
        `SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ? AND result = 'heads'`,
      ),
      userId,
    );
    const tails = getRow<CountRow>(
      db.prepare(
        `SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ? AND result = 'tails'`,
      ),
      userId,
    );
    if (heads == null || tails == null) return undefined;
    return { heads: heads.count, tails: tails.count };
  });
}
