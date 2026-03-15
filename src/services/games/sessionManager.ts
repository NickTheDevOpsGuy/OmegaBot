// src/services/games/sessionManager.ts
//
// Persistent game session management for async/multi-day games (Connect 4, Chess, etc.).
// Sessions persist in game_sessions table; status active | finished | abandoned; configurable expiry.

import { getDb } from "../core/database/db.js";

export const DEFAULT_SESSION_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** Per-game-type expiry (optional). Fallback: DEFAULT_SESSION_EXPIRY_MS. */
export const SESSION_EXPIRY_MS_BY_GAME: Record<string, number> = {
  connect4: DEFAULT_SESSION_EXPIRY_MS,
  tictactoe: DEFAULT_SESSION_EXPIRY_MS,
};

export type SessionStatus = "active" | "finished" | "abandoned";

export type GameSession = {
  gameId: string;
  gameType: string;
  guildId: string | null;
  channelId: string | null;
  messageId: string | null;
  player1Id: string;
  player2Id: string | null;
  boardState: string;
  currentTurn: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  status: SessionStatus;
};

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      game_id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL,
      guild_id TEXT,
      channel_id TEXT,
      message_id TEXT,
      player1_id TEXT NOT NULL,
      player2_id TEXT,
      board_state TEXT NOT NULL,
      current_turn TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_game_sessions_expires ON game_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_players ON game_sessions(player1_id, player2_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_guild ON game_sessions(guild_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
  `);
}

export function getExpiryForGameType(gameType: string): number {
  return SESSION_EXPIRY_MS_BY_GAME[gameType] ?? DEFAULT_SESSION_EXPIRY_MS;
}

/** Get an active session by id. Returns null if expired, finished, or abandoned. */
export function getSession(gameId: string): GameSession | null {
  return getSessionInternal(gameId, { activeOnly: true });
}

/** Get session by id; optionally include finished/abandoned (e.g. for display). */
export function getSessionInternal(
  gameId: string,
  options?: { activeOnly?: boolean },
): GameSession | null {
  ensureTable();
  const db = getDb();
  const now = Date.now();
  const activeOnly = options?.activeOnly !== false;
  const sql = activeOnly
    ? `SELECT game_id AS gameId, game_type AS gameType, guild_id AS guildId, channel_id AS channelId,
         message_id AS messageId, player1_id AS player1Id, player2_id AS player2Id,
         board_state AS boardState, current_turn AS currentTurn,
         created_at AS createdAt, updated_at AS updatedAt, expires_at AS expiresAt,
         COALESCE(status, 'active') AS status
       FROM game_sessions
       WHERE game_id = ? AND expires_at > ? AND COALESCE(status, 'active') = 'active'`
    : `SELECT game_id AS gameId, game_type AS gameType, guild_id AS guildId, channel_id AS channelId,
         message_id AS messageId, player1_id AS player1Id, player2_id AS player2Id,
         board_state AS boardState, current_turn AS currentTurn,
         created_at AS createdAt, updated_at AS updatedAt, expires_at AS expiresAt,
         COALESCE(status, 'active') AS status
       FROM game_sessions WHERE game_id = ?`;
  const row = db.prepare(sql).get(...(activeOnly ? [gameId, now] : [gameId])) as
    | Record<string, unknown>
    | undefined;
  return row ? (row as unknown as GameSession) : null;
}

/** List active sessions for a user (they are player1 or player2). */
export function listActiveForUser(userId: string, gameType?: string): GameSession[] {
  ensureTable();
  const db = getDb();
  const now = Date.now();
  const byType = gameType ? " AND game_type = ?" : "";
  const params = gameType ? [userId, userId, now, gameType] : [userId, userId, now];
  const rows = db
    .prepare(
      `SELECT game_id AS gameId, game_type AS gameType, guild_id AS guildId, channel_id AS channelId,
              message_id AS messageId, player1_id AS player1Id, player2_id AS player2Id,
              board_state AS boardState, current_turn AS currentTurn,
              created_at AS createdAt, updated_at AS updatedAt, expires_at AS expiresAt,
              COALESCE(status, 'active') AS status
       FROM game_sessions
       WHERE (player1_id = ? OR player2_id = ?) AND expires_at > ? AND COALESCE(status, 'active') = 'active'${byType}
       ORDER BY updated_at DESC`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows as unknown as GameSession[];
}

export function saveSession(
  session: Omit<GameSession, "createdAt" | "updatedAt"> & {
    expiresAt?: number;
    status?: SessionStatus;
  },
): void {
  ensureTable();
  const db = getDb();
  const now = Date.now();
  const status = session.status ?? "active";
  const expiresAt = session.expiresAt ?? now + getExpiryForGameType(session.gameType);

  try {
    db.prepare(
      `INSERT INTO game_sessions (game_id, game_type, guild_id, channel_id, message_id, player1_id, player2_id, board_state, current_turn, created_at, updated_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(game_id) DO UPDATE SET
         board_state = ?, current_turn = ?, updated_at = ?, expires_at = ?, status = ?`,
    ).run(
      session.gameId,
      session.gameType,
      session.guildId ?? null,
      session.channelId ?? null,
      session.messageId ?? null,
      session.player1Id,
      session.player2Id ?? null,
      session.boardState,
      session.currentTurn ?? null,
      now,
      now,
      expiresAt,
      status,
      session.boardState,
      session.currentTurn ?? null,
      now,
      expiresAt,
      status,
    );
  } catch (e) {
    const hasStatus = db.prepare("PRAGMA table_info(game_sessions)").all() as {
      name: string;
    }[];
    if (!hasStatus.some((c) => c.name === "status")) {
      db.exec(
        `ALTER TABLE game_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
      );
      return saveSession({ ...session, status });
    }
    throw e;
  }
}

export function updateSessionStatus(gameId: string, status: SessionStatus): void {
  ensureTable();
  const db = getDb();
  db.prepare(`UPDATE game_sessions SET status = ?, updated_at = ? WHERE game_id = ?`).run(
    status,
    Date.now(),
    gameId,
  );
}

export function deleteSession(gameId: string): void {
  ensureTable();
  const db = getDb();
  db.prepare(`DELETE FROM game_sessions WHERE game_id = ?`).run(gameId);
}

/** Remove expired sessions. Call periodically. Optionally mark as abandoned instead of delete. */
export function pruneExpiredSessions(options?: { markAbandoned?: boolean }): number {
  ensureTable();
  const db = getDb();
  const now = Date.now();
  if (options?.markAbandoned) {
    const result = db
      .prepare(
        `UPDATE game_sessions SET status = 'abandoned', updated_at = ? WHERE expires_at <= ? AND COALESCE(status, 'active') = 'active'`,
      )
      .run(now, now);
    return result.changes;
  }
  const result = db.prepare(`DELETE FROM game_sessions WHERE expires_at <= ?`).run(now);
  return result.changes;
}
