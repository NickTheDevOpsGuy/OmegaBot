// src/commands/achievements/definitions.ts
// Achievement definitions and check functions.

import { getDb } from "../../../services/core/database/db.js";
import { getTotalWins, getScalar, getCount } from "../../../services/stores/gameStats/gameStats.js";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "games" | "social" | "dedication" | "luck";
  checkFn: (userId: string, db: ReturnType<typeof getDb>) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    emoji: "🏆",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 1,
  },
  {
    id: "ten_wins",
    name: "Getting Good",
    description: "Win 10 games total",
    emoji: "⭐",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 10,
  },
  {
    id: "fifty_wins",
    name: "Champion",
    description: "Win 50 games total",
    emoji: "🥇",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 50,
  },
  {
    id: "blackjack_natural",
    name: "Natural 21",
    description: "Get a blackjack (natural 21)",
    emoji: "🃏",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "blackjack_stats", "blackjacks") >= 1,
  },
  {
    id: "wordle_streak_7",
    name: "Wordle Wizard",
    description: "Get a 7-day Wordle streak",
    emoji: "🟩",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "wordle_stats", "max_streak") >= 7,
  },
  {
    id: "word_nerd",
    name: "Word Nerd",
    description: "Win 10 Wordle games",
    emoji: "📚",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "wordle_stats", "won") >= 10,
  },
  {
    id: "hangman_hero",
    name: "Hangman Hero",
    description: "Win 10 Hangman games",
    emoji: "🎯",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "hangman_stats", "wins") >= 10,
  },
  {
    id: "hangman_speed_demon",
    name: "Speed Demon",
    description: "Solve a Hangman game in 60 seconds or less",
    emoji: "⚡",
    category: "games",
    checkFn: (u, db) => {
      const best = getScalar(db, u, "hangman_stats", "best_time_seconds");
      return best > 0 && best <= 60;
    },
  },
  {
    id: "card_shark",
    name: "Card Shark",
    description: "Win 25 Blackjack games",
    emoji: "🦈",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "blackjack_stats", "wins") >= 25,
  },
  {
    id: "connect_master",
    name: "Connect Master",
    description: "Win 10 Connect 4 games",
    emoji: "🔴",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "connect4_stats", "wins") >= 10,
  },
  {
    id: "one_eighty",
    name: "One Eighty!",
    description: "Hit a 180 in darts",
    emoji: "🎯",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "darts_stats", "count_180") >= 1,
  },
  {
    id: "ton_of_fun",
    name: "Ton of Fun",
    description: "Score 100+ in a darts round",
    emoji: "💯",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "darts_stats", "best_round") >= 100,
  },
  {
    id: "jackpot",
    name: "Jackpot!",
    description: "Hit a slot machine jackpot",
    emoji: "💎",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "jackpots") >= 1,
  },
  {
    id: "lucky_streak",
    name: "Lucky Streak",
    description: "Win slots 5 times",
    emoji: "🎰",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "wins") >= 5,
  },
  {
    id: "coin_master",
    name: "Coin Master",
    description: "Flip 100 coins",
    emoji: "🪙",
    category: "luck",
    checkFn: (u, db) => getCount(db, "coin_flips", "user_id", u) >= 100,
  },
  {
    id: "high_roller",
    name: "High Roller",
    description: "Spin the slots 100 times",
    emoji: "🎲",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "spins") >= 100,
  },
  {
    id: "daily_7",
    name: "Week Warrior",
    description: "Get a 7-day daily check-in streak",
    emoji: "📅",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "daily_checkins", "best_streak") >= 7,
  },
  {
    id: "daily_30",
    name: "Month Master",
    description: "Get a 30-day daily check-in streak",
    emoji: "🔥",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "daily_checkins", "best_streak") >= 30,
  },
  {
    id: "trivia_master",
    name: "Trivia Master",
    description: "Answer 50 trivia questions correctly",
    emoji: "🧠",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "trivia_stats", "correct") >= 50,
  },
  {
    id: "trivia_streak",
    name: "On Fire",
    description: "Get a 10-question trivia streak",
    emoji: "💯",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "trivia_stats", "best_streak") >= 10,
  },
  {
    id: "generous",
    name: "Generous",
    description: "Host 3 giveaways",
    emoji: "🎁",
    category: "social",
    checkFn: (u, db) => getCount(db, "giveaways", "host_id", u) >= 3,
  },
  {
    id: "quotable",
    name: "Quotable",
    description: "Have one of your quotes saved",
    emoji: "💬",
    category: "social",
    checkFn: (u, db) => getCount(db, "quotes", "author_id", u) >= 1,
  },
];
