// src/services/platform/eventsService.ts
//
// Events: tournaments, weekly resets, community challenges.
// Used by future /event commands and web API.

import { randomUUID } from "node:crypto";
import { getDb } from "../core/database/db.js";

export type EventStatus = "draft" | "active" | "ended" | "cancelled";

export type Event = {
  eventId: string;
  title: string;
  description: string | null;
  startTime: number;
  endTime: number;
  status: EventStatus;
  createdAt: number;
  updatedAt: number;
};

export type EventParticipant = {
  eventId: string;
  userId: string;
  joinedAt: number;
};

function ensureTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS event_participants (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_times ON events(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
  `);
}

export function createEvent(input: {
  title: string;
  description?: string | null;
  startTime: number;
  endTime: number;
  status?: EventStatus;
}): Event {
  ensureTables();
  const db = getDb();
  const eventId = randomUUID();
  const now = Date.now();
  const status = input.status ?? "draft";
  db.prepare(
    `INSERT INTO events (event_id, title, description, start_time, end_time, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    eventId,
    input.title,
    input.description ?? null,
    input.startTime,
    input.endTime,
    status,
    now,
    now,
  );
  return {
    eventId,
    title: input.title,
    description: input.description ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

export function getEvent(eventId: string): Event | null {
  ensureTables();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT event_id AS eventId, title, description, start_time AS startTime, end_time AS endTime, status, created_at AS createdAt, updated_at AS updatedAt FROM events WHERE event_id = ?`,
    )
    .get(eventId) as Event | undefined;
  return row ?? null;
}

export function listEvents(options?: { status?: EventStatus; limit?: number }): Event[] {
  ensureTables();
  const db = getDb();
  const limit = options?.limit ?? 50;
  let sql = `SELECT event_id AS eventId, title, description, start_time AS startTime, end_time AS endTime, status, created_at AS createdAt, updated_at AS updatedAt FROM events`;
  const params: unknown[] = [];
  if (options?.status) {
    sql += ` WHERE status = ?`;
    params.push(options.status);
  }
  sql += ` ORDER BY start_time DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params) as Event[];
}

export function joinEvent(eventId: string, userId: string): boolean {
  ensureTables();
  const db = getDb();
  const event = getEvent(eventId);
  if (!event || event.status !== "active") return false;
  const now = Date.now();
  try {
    db.prepare(
      `INSERT INTO event_participants (event_id, user_id, joined_at) VALUES (?, ?, ?)`,
    ).run(eventId, userId, now);
    return true;
  } catch {
    return false;
  }
}

export function getEventParticipants(eventId: string): EventParticipant[] {
  ensureTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT event_id AS eventId, user_id AS userId, joined_at AS joinedAt FROM event_participants WHERE event_id = ? ORDER BY joined_at ASC`,
    )
    .all(eventId) as EventParticipant[];
}

export function updateEventStatus(eventId: string, status: EventStatus): boolean {
  ensureTables();
  const db = getDb();
  const result = db
    .prepare(`UPDATE events SET status = ?, updated_at = ? WHERE event_id = ?`)
    .run(status, Date.now(), eventId);
  return result.changes > 0;
}

export type UpdateEventInput = {
  title?: string;
  description?: string | null;
  startTime?: number;
  endTime?: number;
  status?: EventStatus;
};

export function updateEvent(eventId: string, input: UpdateEventInput): boolean {
  ensureTables();
  const db = getDb();
  const event = getEvent(eventId);
  if (!event) return false;
  const now = Date.now();
  const title = input.title ?? event.title;
  const description =
    input.description !== undefined ? input.description : event.description;
  const startTime = input.startTime ?? event.startTime;
  const endTime = input.endTime ?? event.endTime;
  const status = input.status ?? event.status;
  const result = db
    .prepare(
      `UPDATE events SET title = ?, description = ?, start_time = ?, end_time = ?, status = ?, updated_at = ? WHERE event_id = ?`,
    )
    .run(title, description, startTime, endTime, status, now, eventId);
  return result.changes > 0;
}
