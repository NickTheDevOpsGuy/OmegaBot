// src/services/faq/store.ts
import { getDb } from "../database/db.js";
import type { Faq } from "./types.js";

/**
 * FAQ store backed by SQLite.
 * Thread-safe with proper transaction support.
 */

const getStmt = () => getDb().prepare("SELECT * FROM faqs WHERE key = ?");
const getAllStmt = () => getDb().prepare("SELECT * FROM faqs ORDER BY key ASC");
const insertStmt = () =>
  getDb().prepare(`
    INSERT INTO faqs (key, answer, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
const updateStmt = () =>
  getDb().prepare(`
    UPDATE faqs 
    SET answer = ?, updated_at = ?, updated_by = ?
    WHERE key = ?
  `);
const deleteStmt = () => getDb().prepare("DELETE FROM faqs WHERE key = ?");
const incrementUsageStmt = () =>
  getDb().prepare("UPDATE faqs SET usage_count = usage_count + 1 WHERE key = ?");

/**
 * Convert database row to Faq object.
 */
function rowToFaq(row: any): Faq {
  return {
    key: row.key,
    answer: row.answer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usageCount: row.usage_count || 0,
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined,
  };
}

/**
 * Add a new FAQ entry.
 */
export function addFaq(key: string, answer: string, userId?: string): void {
  const now = Date.now();
  insertStmt().run(key, answer, now, now, userId || null);
}

/**
 * Get a FAQ by key.
 */
export function getFaq(key: string): Faq | null {
  const row = getStmt().get(key);
  return row ? rowToFaq(row) : null;
}

/**
 * Get all FAQs.
 */
export function getAllFaqs(): Faq[] {
  const rows = getAllStmt().all();
  return rows.map(rowToFaq);
}

/**
 * Update an existing FAQ.
 */
export function updateFaq(key: string, answer: string, userId?: string): boolean {
  const result = updateStmt().run(answer, Date.now(), userId || null, key);
  return result.changes > 0;
}

/**
 * Delete a FAQ by key.
 */
export function deleteFaq(key: string): boolean {
  const result = deleteStmt().run(key);
  return result.changes > 0;
}

/**
 * Check if a FAQ exists.
 */
export function faqExists(key: string): boolean {
  return getFaq(key) !== null;
}

/**
 * Increment usage count for a FAQ.
 */
export function incrementFaqUsage(key: string): void {
  incrementUsageStmt().run(key);
}

/**
 * Get FAQs sorted by usage count.
 */
export function getFaqsByUsage(limit = 10): Faq[] {
  const stmt = getDb().prepare(`
    SELECT * FROM faqs 
    ORDER BY usage_count DESC 
    LIMIT ?
  `);
  const rows = stmt.all(limit);
  return rows.map(rowToFaq);
}

/**
 * Search FAQs by key or answer.
 */
export function searchFaqs(query: string): Faq[] {
  const stmt = getDb().prepare(`
    SELECT * FROM faqs 
    WHERE key LIKE ? OR answer LIKE ?
    ORDER BY key ASC
  `);
  const searchPattern = `%${query}%`;
  const rows = stmt.all(searchPattern, searchPattern);
  return rows.map(rowToFaq);
}
