// src/web/auth.ts
// Auth for web API: session (Discord OAuth) and API key. Optional middleware behavior via getAuth().

import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Session = { userId: string; expiresAt: number };
const sessions = new Map<string, Session>();

function pruneSessions(): void {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (s.expiresAt <= now) sessions.delete(id);
  }
}

export function createSession(userId: string): string {
  pruneSessions();
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
}

export function getSession(sessionId: string): string | null {
  const s = sessions.get(sessionId);
  if (!s || s.expiresAt <= Date.now()) return null;
  return s.userId;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

function getBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function getSessionFromCookie(req: IncomingMessage): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(/\bsession_id=([^\s;]+)/);
  return match ? match[1].trim() || null : null;
}

function getApiKey(req: IncomingMessage): string | null {
  const key = req.headers["x-api-key"];
  if (typeof key === "string") return key.trim() || null;
  return null;
}

export function getValidApiKey(): string | null {
  const k = process.env.WEB_API_KEY;
  return typeof k === "string" && k.length > 0 ? k : null;
}

export type AuthResult =
  | { type: "session"; userId: string }
  | { type: "api_key"; userId?: string }
  | { type: null };

/**
 * Resolve auth from request. Session gives userId; API key allows access (userId from body for writes).
 */
export function getAuth(req: IncomingMessage): AuthResult {
  const bearer = getBearerToken(req);
  const sessionId = bearer ?? getSessionFromCookie(req);
  if (sessionId) {
    const userId = getSession(sessionId);
    if (userId) return { type: "session", userId };
  }
  const apiKey = getApiKey(req);
  const validKey = getValidApiKey();
  if (validKey && apiKey === validKey) return { type: "api_key" };
  return { type: null };
}

/** Require auth; returns userId for session, or undefined for api_key (caller must use body.userId for writes). */
export function requireAuth(
  req: IncomingMessage,
): { userId?: string; type: "session" | "api_key" } | null {
  const auth = getAuth(req);
  if (auth.type === "session") return { userId: auth.userId, type: "session" };
  if (auth.type === "api_key") return { type: "api_key" };
  return null;
}
