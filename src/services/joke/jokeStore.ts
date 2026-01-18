// src/services/joke/jokeStore.ts
import { getDb } from "../database/db.js";

export type JokeCategory = "boomer" | "genx" | "millennial" | "genz" | "genalpha" | "random" | "tech" | "dark" | "wholesome" | "anti" | "puns" | "oberservational" | "dad";

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
  "oberservational",
  "dad"
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
  
  const result = db.prepare(`
    INSERT INTO jokes (joke_text, category, added_by, added_at, usage_count)
    VALUES (?, ?, ?, ?, 0)
  `).run(jokeText, category, userId, Date.now());

  return {
    id: result.lastInsertRowid as number,
    joke_text: jokeText,
    category,
    added_by: userId,
    added_at: Date.now(),
    usage_count: 0,
  };
}

export function getRandomJoke(category?: JokeCategory): Joke | null {
  const db = getDb();
  
  let query = "SELECT * FROM jokes";
  const params: any[] = [];
  
  if (category && category !== "random") {
    query += " WHERE category = ?";
    params.push(category);
  }
  
  query += " ORDER BY RANDOM() LIMIT 1";
  
  const joke = db.prepare(query).get(...params) as Joke | undefined;
  
  if (joke) {
    // Increment usage count
    db.prepare("UPDATE jokes SET usage_count = usage_count + 1 WHERE id = ?").run(joke.id);
  }
  
  return joke || null;
}

export function removeJoke(jokeId: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM jokes WHERE id = ?").run(jokeId);
  return result.changes > 0;
}

export function getJoke(jokeId: number): Joke | null {
  const db = getDb();
  return db.prepare("SELECT * FROM jokes WHERE id = ?").get(jokeId) as Joke | null;
}

export function listJokes(category?: JokeCategory, limit: number = 50): Joke[] {
  const db = getDb();
  
  let query = "SELECT * FROM jokes";
  const params: any[] = [];
  
  if (category && category !== "random") {
    query += " WHERE category = ?";
    params.push(category);
  }
  
  query += " ORDER BY added_at DESC LIMIT ?";
  params.push(limit);
  
  return db.prepare(query).all(...params) as Joke[];
}

export function getJokeStats(): { total: number; byCategory: Record<string, number> } {
  const db = getDb();
  
  const total = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as { count: number };
  
  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM jokes 
    GROUP BY category
  `).all() as { category: string; count: number }[];
  
  const categoryMap: Record<string, number> = {};
  byCategory.forEach(row => {
    categoryMap[row.category] = row.count;
  });
  
  return {
    total: total.count,
    byCategory: categoryMap,
  };
}
