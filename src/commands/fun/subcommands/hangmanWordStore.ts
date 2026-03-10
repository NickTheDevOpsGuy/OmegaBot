// src/commands/fun/subcommands/hangmanWordStore.ts
// SQLite-backed hangman word list. Table and seed words are in migrations (schema.sql + 005_hangman_seed_words.sql).

import { getDb } from "../../../services/database/db.js";

export type HangmanDifficulty = "easy" | "medium" | "hard";

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hangman_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
      added_by TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(word)
    );
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_hangman_words_difficulty ON hangman_words(difficulty);",
  );
}

/**
 * Returns a random word from the hangman_words table for use in a game.
 * @param difficulty - If set, only words of this difficulty (easy/medium/hard) are considered.
 * @returns The word in lowercase, or null if no words exist for the given filter.
 */
export function getRandomWord(difficulty?: HangmanDifficulty): string | null {
  ensureTable();
  const db = getDb();
  const stmt =
    difficulty == null
      ? db.prepare("SELECT word FROM hangman_words ORDER BY RANDOM() LIMIT 1")
      : db.prepare(
          "SELECT word FROM hangman_words WHERE difficulty = ? ORDER BY RANDOM() LIMIT 1",
        );
  const row = (difficulty == null ? stmt.get() : stmt.get(difficulty)) as
    | { word: string }
    | undefined;
  return row?.word ?? null;
}

/** Add a word (admin). Returns true if added, false if duplicate. */
export function addWord(
  word: string,
  difficulty: HangmanDifficulty,
  addedBy: string,
): boolean {
  ensureTable();
  const db = getDb();
  const normalized = word.toLowerCase().trim();
  if (!/^[a-z]+$/.test(normalized)) return false;
  try {
    db.prepare(
      `INSERT INTO hangman_words (word, difficulty, added_by, created_at) VALUES (?, ?, ?, ?)`,
    ).run(normalized, difficulty, addedBy, Date.now());
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) return false;
    throw err;
  }
}

/** List words, optionally by difficulty. */
export function listWords(
  difficulty?: HangmanDifficulty,
): { word: string; difficulty: string }[] {
  ensureTable();
  const db = getDb();
  const stmt =
    difficulty == null
      ? db.prepare("SELECT word, difficulty FROM hangman_words ORDER BY difficulty, word")
      : db.prepare(
          "SELECT word, difficulty FROM hangman_words WHERE difficulty = ? ORDER BY word",
        );
  const rows = (difficulty == null ? stmt.all() : stmt.all(difficulty)) as Array<{
    word: string;
    difficulty: string;
  }>;
  return rows;
}

/** Total word count. */
export function getWordCount(): number {
  ensureTable();
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as c FROM hangman_words").get() as {
    c: number;
  };
  return row.c;
}
