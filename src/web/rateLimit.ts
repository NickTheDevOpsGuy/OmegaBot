// src/web/rateLimit.ts
// Simple in-memory rate limit for web API (auth and write endpoints).

import type { IncomingMessage } from "node:http";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_AUTH_PER_WINDOW = 10; // login + callback
const MAX_WRITE_PER_WINDOW = 60; // POST/PATCH per key

const authCounts = new Map<string, { count: number; resetAt: number }>();
const writeCounts = new Map<string, { count: number; resetAt: number }>();

function getKey(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null;
  return ip ?? req.socket?.remoteAddress ?? "unknown";
}

function check(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = map.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    map.set(key, entry);
  }
  entry.count += 1;
  const allowed = entry.count <= max;
  const remaining = Math.max(0, max - entry.count);
  return { allowed, remaining, resetAt: entry.resetAt };
}

export function getClientKey(req: IncomingMessage): string {
  return getKey(req);
}

export function checkAuthRateLimit(req: IncomingMessage): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  return check(authCounts, getKey(req), MAX_AUTH_PER_WINDOW);
}

export function checkWriteRateLimit(req: IncomingMessage): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  return check(writeCounts, getKey(req), MAX_WRITE_PER_WINDOW);
}
