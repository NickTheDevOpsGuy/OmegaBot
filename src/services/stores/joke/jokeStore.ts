// src/services/joke/jokeStore.ts
import { getAll, getDb, getRow } from "../../core/database/db.js";
import { logger } from "../../../utils/logger.js";

export type JokeCategory =
  | "boomer"
  | "genx"
  | "millennial"
  | "genz"
  | "genalpha"
  | "random"
  | "tech"
  | "dark"
  | "wholesome"
  | "anti"
  | "puns"
  | "observational"
  | "dad";

export const JOKE_CATEGORIES: JokeCategory[] = [
  "boomer",
  "genx",
  "millennial",
  "genz",
  "genalpha",
  "random",
  "tech",
  "dark",
  "wholesome",
  "anti",
  "puns",
  "observational",
  "dad",
];

export interface Joke {
  id: number;
  joke_text: string;
  category: JokeCategory;
  added_by: string;
  added_at: number;
  usage_count: number;
}

export function addJoke(jokeText: string, category: JokeCategory, userId: string): Joke {
  const db = getDb();

  try {
    const result = db
      .prepare(
        `
      INSERT INTO jokes (joke_text, category, added_by, added_at, usage_count)
      VALUES (?, ?, ?, ?, 0)
    `,
      )
      .run(jokeText, category, userId, Date.now());

    const joke: Joke = {
      id: result.lastInsertRowid as number,
      joke_text: jokeText,
      category,
      added_by: userId,
      added_at: Date.now(),
      usage_count: 0,
    };

    logger.info({ jokeId: joke.id, category, userId }, "Joke added");
    return joke;
  } catch (error) {
    logger.error({ error, category, userId }, "[joke/store] add joke threw");
    throw error;
  }
}

export function getRandomJoke(category?: JokeCategory): Joke | null {
  const db = getDb();

  try {
    let query = "SELECT * FROM jokes";
    const params: (string | number)[] = [];

    if (category && category !== "random") {
      query += " WHERE category = ?";
      params.push(category);
    }

    query += " ORDER BY RANDOM() LIMIT 1";

    const joke = getRow<Joke>(db.prepare(query), ...params);

    if (joke) {
      // Increment usage count
      db.prepare("UPDATE jokes SET usage_count = usage_count + 1 WHERE id = ?").run(
        joke.id,
      );
    }

    return joke || null;
  } catch (error) {
    logger.error({ error, category }, "[joke/store] get random joke threw");
    throw error;
  }
}

export function removeJoke(jokeId: number): boolean {
  const db = getDb();

  try {
    const result = db.prepare("DELETE FROM jokes WHERE id = ?").run(jokeId);
    const success = result.changes > 0;

    if (success) {
      logger.info({ jokeId }, "Joke removed");
    } else {
      logger.warn({ jokeId }, "Attempted to remove non-existent joke");
    }

    return success;
  } catch (error) {
    logger.error({ error, jokeId }, "[joke/store] remove joke threw");
    throw error;
  }
}

export function getJoke(jokeId: number): Joke | null {
  const db = getDb();

  try {
    const row = getRow<Joke>(db.prepare("SELECT * FROM jokes WHERE id = ?"), jokeId);
    return row ?? null;
  } catch (error) {
    logger.error({ error, jokeId }, "[joke/store] get joke threw");
    throw error;
  }
}

export function listJokes(category?: JokeCategory, limit: number = 50): Joke[] {
  const db = getDb();

  try {
    let query = "SELECT * FROM jokes";
    const params: (string | number)[] = [];

    if (category && category !== "random") {
      query += " WHERE category = ?";
      params.push(category);
    }

    query += " ORDER BY added_at DESC LIMIT ?";
    params.push(limit);

    return getAll<Joke>(db.prepare(query), ...params);
  } catch (error) {
    logger.error({ error, category, limit }, "[joke/store] list jokes threw");
    throw error;
  }
}

type JokeCountRow = { count: number };
type JokeCategoryRow = { category: string; count: number };

export function getJokeStats(): { total: number; byCategory: Record<string, number> } {
  const db = getDb();

  try {
    const totalRow = getRow<JokeCountRow>(
      db.prepare("SELECT COUNT(*) as count FROM jokes"),
    );
    const total = totalRow?.count ?? 0;

    const byCategory = getAll<JokeCategoryRow>(
      db.prepare(
        `
      SELECT category, COUNT(*) as count 
      FROM jokes 
      GROUP BY category
    `,
      ),
    );

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((row) => {
      categoryMap[row.category] = row.count;
    });

    return {
      total,
      byCategory: categoryMap,
    };
  } catch (error) {
    logger.error({ error }, "[joke/store] get joke stats threw");
    throw error;
  }
}
