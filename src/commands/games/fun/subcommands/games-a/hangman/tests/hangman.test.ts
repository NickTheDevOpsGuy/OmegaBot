// src/commands/fun/subcommands/hangman.test.ts
//
// Tests for the hangman word guessing game.
//
// The hangman game tracks:
// - Wins and losses
// - Total guesses across all games
//
// Coverage:
// - Stats tracking
// - Game state management
// - Win/loss detection

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../../../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../../../../../services/core/database/db.js";

useInMemoryDb();

// Replicate the hangman database schema
function ensureHangmanTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_guesses INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

// Simulated stats functions
function getStats(userId: string): {
  wins: number;
  losses: number;
  totalGuesses: number;
} {
  ensureHangmanTable();
  const db = getDb();

  const row = db
    .prepare(`SELECT wins, losses, total_guesses FROM hangman_stats WHERE user_id = ?`)
    .get(userId) as { wins: number; losses: number; total_guesses: number } | undefined;

  if (!row) return { wins: 0, losses: 0, totalGuesses: 0 };
  return { wins: row.wins, losses: row.losses, totalGuesses: row.total_guesses };
}

function recordGame(userId: string, won: boolean, guessCount: number): void {
  ensureHangmanTable();
  const db = getDb();
  const now = Date.now();

  const existing = getStats(userId);

  if (existing.wins === 0 && existing.losses === 0) {
    db.prepare(
      `
      INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(userId, won ? 1 : 0, won ? 0 : 1, guessCount, now);
  } else {
    db.prepare(
      `
      UPDATE hangman_stats 
      SET wins = wins + ?, losses = losses + ?, total_guesses = total_guesses + ?, updated_at = ?
      WHERE user_id = ?
    `,
    ).run(won ? 1 : 0, won ? 0 : 1, guessCount, now, userId);
  }
}

// Game logic helpers
const MAX_WRONG_GUESSES = 6;

type GameState = {
  word: string;
  guessedLetters: Set<string>;
  wrongGuesses: number;
};

function createGame(word: string): GameState {
  return {
    word: word.toLowerCase(),
    guessedLetters: new Set(),
    wrongGuesses: 0,
  };
}

function makeGuess(
  game: GameState,
  letter: string,
): "correct" | "wrong" | "already_guessed" {
  const lowerLetter = letter.toLowerCase();

  if (game.guessedLetters.has(lowerLetter)) {
    return "already_guessed";
  }

  game.guessedLetters.add(lowerLetter);

  if (game.word.includes(lowerLetter)) {
    return "correct";
  } else {
    game.wrongGuesses++;
    return "wrong";
  }
}

function isWon(game: GameState): boolean {
  return [...game.word].every((char) => game.guessedLetters.has(char));
}

function isLost(game: GameState): boolean {
  return game.wrongGuesses >= MAX_WRONG_GUESSES;
}

function getMaskedWord(game: GameState): string {
  return [...game.word]
    .map((char) => (game.guessedLetters.has(char) ? char : "_"))
    .join(" ");
}

describe("hangman game", () => {
  beforeEach(() => {
    ensureHangmanTable();
  });

  describe("stats tracking", () => {
    it("tracks wins", () => {
      recordGame("user1", true, 5);
      const stats = getStats("user1");

      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
    });

    it("tracks losses", () => {
      recordGame("user1", false, 6);
      const stats = getStats("user1");

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(1);
    });

    it("accumulates total guesses", () => {
      recordGame("user1", true, 5);
      recordGame("user1", false, 8);
      recordGame("user1", true, 4);

      const stats = getStats("user1");

      expect(stats.totalGuesses).toBe(17);
    });

    it("returns zeros for unknown user", () => {
      const stats = getStats("unknown");

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.totalGuesses).toBe(0);
    });
  });

  describe("game state", () => {
    it("creates game with empty guessed letters", () => {
      const game = createGame("apple");

      expect(game.word).toBe("apple");
      expect(game.guessedLetters.size).toBe(0);
      expect(game.wrongGuesses).toBe(0);
    });

    it("tracks correct guesses", () => {
      const game = createGame("apple");
      const result = makeGuess(game, "a");

      expect(result).toBe("correct");
      expect(game.guessedLetters.has("a")).toBe(true);
      expect(game.wrongGuesses).toBe(0);
    });

    it("tracks wrong guesses", () => {
      const game = createGame("apple");
      const result = makeGuess(game, "z");

      expect(result).toBe("wrong");
      expect(game.guessedLetters.has("z")).toBe(true);
      expect(game.wrongGuesses).toBe(1);
    });

    it("detects already guessed letters", () => {
      const game = createGame("apple");
      makeGuess(game, "a");
      const result = makeGuess(game, "a");

      expect(result).toBe("already_guessed");
      expect(game.wrongGuesses).toBe(0); // Should not increase
    });

    it("is case insensitive", () => {
      const game = createGame("Apple");
      makeGuess(game, "A");

      expect(game.guessedLetters.has("a")).toBe(true);
      expect(isWon(game)).toBe(false); // Still need other letters
    });
  });

  describe("win detection", () => {
    it("detects win when all letters guessed", () => {
      const game = createGame("cat");
      makeGuess(game, "c");
      makeGuess(game, "a");
      makeGuess(game, "t");

      expect(isWon(game)).toBe(true);
    });

    it("not won with missing letters", () => {
      const game = createGame("cat");
      makeGuess(game, "c");
      makeGuess(game, "a");

      expect(isWon(game)).toBe(false);
    });
  });

  describe("loss detection", () => {
    it("detects loss after max wrong guesses", () => {
      const game = createGame("cat");

      // 6 wrong guesses
      makeGuess(game, "x");
      makeGuess(game, "y");
      makeGuess(game, "z");
      makeGuess(game, "q");
      makeGuess(game, "w");
      makeGuess(game, "r");

      expect(isLost(game)).toBe(true);
    });

    it("not lost before max wrong guesses", () => {
      const game = createGame("cat");

      makeGuess(game, "x");
      makeGuess(game, "y");

      expect(isLost(game)).toBe(false);
    });
  });

  describe("masked word display", () => {
    it("shows underscores for unguessed letters", () => {
      const game = createGame("cat");

      expect(getMaskedWord(game)).toBe("_ _ _");
    });

    it("reveals guessed letters", () => {
      const game = createGame("cat");
      makeGuess(game, "c");
      makeGuess(game, "t");

      expect(getMaskedWord(game)).toBe("c _ t");
    });

    it("shows full word when complete", () => {
      const game = createGame("cat");
      makeGuess(game, "c");
      makeGuess(game, "a");
      makeGuess(game, "t");

      expect(getMaskedWord(game)).toBe("c a t");
    });
  });
});
