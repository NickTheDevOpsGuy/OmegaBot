// src/services/joke/jokeStore.ts
import { getDb } from "../database/db.js";
import { logger } from "../../utils/logger.js";

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
    logger.error({ error, category, userId }, "Failed to add joke");
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

    const joke = db.prepare(query).get(...params) as Joke | undefined;

    if (joke) {
      // Increment usage count
      db.prepare("UPDATE jokes SET usage_count = usage_count + 1 WHERE id = ?").run(
        joke.id,
      );
    }

    return joke || null;
  } catch (error) {
    logger.error({ error, category }, "Failed to get random joke");
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
    logger.error({ error, jokeId }, "Failed to remove joke");
    throw error;
  }
}

export function getJoke(jokeId: number): Joke | null {
  const db = getDb();

  try {
    return db.prepare("SELECT * FROM jokes WHERE id = ?").get(jokeId) as Joke | null;
  } catch (error) {
    logger.error({ error, jokeId }, "Failed to get joke");
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

    return db.prepare(query).all(...params) as Joke[];
  } catch (error) {
    logger.error({ error, category, limit }, "Failed to list jokes");
    throw error;
  }
}

export function getJokeStats(): { total: number; byCategory: Record<string, number> } {
  const db = getDb();

  try {
    const total = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
      count: number;
    };

    const byCategory = db
      .prepare(
        `
      SELECT category, COUNT(*) as count 
      FROM jokes 
      GROUP BY category
    `,
      )
      .all() as { category: string; count: number }[];

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((row) => {
      categoryMap[row.category] = row.count;
    });

    return {
      total: total.count,
      byCategory: categoryMap,
    };
  } catch (error) {
    logger.error({ error }, "Failed to get joke stats");
    throw error;
  }
}
