// src/commands/fun/subcommands/hangmanWordStore.ts
// SQLite-backed hangman word list with difficulty. Seed words on first use.

import { getDb } from "../../../services/database/db.js";

export type HangmanDifficulty = "easy" | "medium" | "hard";

const SEED_WORDS: { word: string; difficulty: HangmanDifficulty }[] = [
  { word: "apple", difficulty: "easy" },
  { word: "beach", difficulty: "easy" },
  { word: "chair", difficulty: "easy" },
  { word: "dance", difficulty: "easy" },
  { word: "eagle", difficulty: "easy" },
  { word: "flame", difficulty: "easy" },
  { word: "grape", difficulty: "easy" },
  { word: "house", difficulty: "easy" },
  { word: "juice", difficulty: "easy" },
  { word: "lemon", difficulty: "easy" },
  { word: "mouse", difficulty: "easy" },
  { word: "night", difficulty: "easy" },
  { word: "ocean", difficulty: "easy" },
  { word: "piano", difficulty: "easy" },
  { word: "queen", difficulty: "easy" },
  { word: "river", difficulty: "easy" },
  { word: "snake", difficulty: "easy" },
  { word: "tiger", difficulty: "easy" },
  { word: "uncle", difficulty: "easy" },
  { word: "viola", difficulty: "easy" },
  { word: "water", difficulty: "easy" },
  { word: "xenon", difficulty: "easy" },
  { word: "yacht", difficulty: "easy" },
  { word: "zebra", difficulty: "easy" },
  { word: "brain", difficulty: "medium" },
  { word: "cloud", difficulty: "medium" },
  { word: "dream", difficulty: "medium" },
  { word: "earth", difficulty: "medium" },
  { word: "frost", difficulty: "medium" },
  { word: "ghost", difficulty: "medium" },
  { word: "happy", difficulty: "medium" },
  { word: "image", difficulty: "medium" },
  { word: "jolly", difficulty: "medium" },
  { word: "karma", difficulty: "medium" },
  { word: "lunar", difficulty: "medium" },
  { word: "magic", difficulty: "medium" },
  { word: "ninja", difficulty: "medium" },
  { word: "opera", difficulty: "medium" },
  { word: "pixel", difficulty: "medium" },
  { word: "quest", difficulty: "medium" },
  { word: "robot", difficulty: "medium" },
  { word: "storm", difficulty: "medium" },
  { word: "train", difficulty: "medium" },
  { word: "urban", difficulty: "medium" },
  { word: "video", difficulty: "medium" },
  { word: "witch", difficulty: "medium" },
  { word: "youth", difficulty: "medium" },
  { word: "knife", difficulty: "medium" },
];

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

function seedIfEmpty(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as c FROM hangman_words").get() as {
    c: number;
  };
  if (count.c > 0) return;
  const now = Date.now();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO hangman_words (word, difficulty, added_by, created_at) VALUES (?, ?, NULL, ?)`,
  );
  for (const { word, difficulty } of SEED_WORDS) {
    insert.run(word.toLowerCase(), difficulty, now);
  }
}

/** Get a random word, optionally filtered by difficulty. */
export function getRandomWord(difficulty?: HangmanDifficulty): string | null {
  ensureTable();
  seedIfEmpty();
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
  seedIfEmpty();
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
  seedIfEmpty();
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as c FROM hangman_words").get() as {
    c: number;
  };
  return row.c;
}
