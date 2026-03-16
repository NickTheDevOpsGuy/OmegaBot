// src/services/platform/postsService.ts
//
// Lightweight social posts: achievements, highlights, announcements.
// author_id = discord_id or platform user_id.

import { randomUUID } from "node:crypto";
import { getDb } from "../core/database/db.js";

export type Post = {
  postId: string;
  authorId: string;
  content: string;
  attachments: string | null;
  createdAt: number;
};

function ensureTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      post_id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
  `);
}

export function createPost(
  authorId: string,
  content: string,
  attachments?: string | null,
): Post {
  ensureTables();
  const db = getDb();
  const postId = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO posts (post_id, author_id, content, attachments, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(postId, authorId, content, attachments ?? null, now);
  return {
    postId,
    authorId,
    content,
    attachments: attachments ?? null,
    createdAt: now,
  };
}

export function getPost(postId: string): (Post & { likes: number }) | null {
  ensureTables();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT post_id AS postId, author_id AS authorId, content, attachments, created_at AS createdAt FROM posts WHERE post_id = ?`,
    )
    .get(postId) as Post | undefined;
  if (!row) return null;
  const likesRow = db
    .prepare(`SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?`)
    .get(postId) as { c: number };
  return { ...row, likes: likesRow?.c ?? 0 };
}

export function listPosts(options?: { authorId?: string; limit?: number }): Post[] {
  ensureTables();
  const db = getDb();
  const limit = options?.limit ?? 50;
  if (options?.authorId) {
    return db
      .prepare(
        `SELECT post_id AS postId, author_id AS authorId, content, attachments, created_at AS createdAt
         FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(options.authorId, limit) as Post[];
  }
  return db
    .prepare(
      `SELECT post_id AS postId, author_id AS authorId, content, attachments, created_at AS createdAt
       FROM posts ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Post[];
}

export function likePost(postId: string, userId: string): boolean {
  ensureTables();
  const db = getDb();
  const now = Date.now();
  try {
    db.prepare(
      `INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`,
    ).run(postId, userId, now);
    return true;
  } catch {
    return false;
  }
}

export function unlikePost(postId: string, userId: string): boolean {
  ensureTables();
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`)
    .run(postId, userId);
  return result.changes > 0;
}

export type PostComment = {
  commentId: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: number;
};

function ensureCommentsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_comments (
      comment_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_comments_author ON post_comments(author_id);
  `);
}

export function addComment(postId: string, authorId: string, content: string): PostComment | null {
  ensureTables();
  ensureCommentsTable();
  const db = getDb();
  if (!getPost(postId)) return null;
  const commentId = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO post_comments (comment_id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(commentId, postId, authorId, content.trim().slice(0, 2000), now);
  return { commentId, postId, authorId, content: content.trim().slice(0, 2000), createdAt: now };
}

export function getComments(postId: string, limit?: number): PostComment[] {
  ensureCommentsTable();
  const db = getDb();
  const limitNum = Math.min(limit ?? 100, 200);
  return db
    .prepare(
      `SELECT comment_id AS commentId, post_id AS postId, author_id AS authorId, content, created_at AS createdAt
       FROM post_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT ?`,
    )
    .all(postId, limitNum) as PostComment[];
}
