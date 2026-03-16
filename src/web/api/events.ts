// src/web/api/events.ts
// GET /api/events, GET /api/events/:id, POST /api/events/join (uses eventsService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "../auth.js";
import {
  listEvents,
  getEvent,
  getEventParticipants,
  joinEvent,
  createEvent,
  updateEvent,
} from "../../services/platform/eventsService.js";

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export async function handleGetEvents(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(_req.url ?? "", `http://${_req.headers.host}`);
  const status = url.searchParams.get("status") as "active" | "ended" | undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50);
  const events = listEvents({ status, limit });
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ events }));
}

export async function handleGetEvent(
  _req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): Promise<void> {
  const event = getEvent(eventId);
  res.setHeader("Content-Type", "application/json");
  if (!event) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Event not found" }));
    return;
  }
  const participants = getEventParticipants(eventId);
  res.writeHead(200);
  res.end(JSON.stringify({ ...event, participants }));
}

export async function handlePostEventsJoin(
  req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): Promise<void> {
  const body = await parseBody(req);
  const userId = body.userId as string | undefined;
  if (!userId) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const ok = joinEvent(eventId, userId);
  res.setHeader("Content-Type", "application/json");
  if (!ok) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Could not join event (invalid or not active)" }));
    return;
  }
  const { publish } = await import("../sse.js");
  const event = getEvent(eventId);
  const participants = getEventParticipants(eventId);
  publish("event", eventId, { ...event, participants });
  res.writeHead(200);
  res.end(JSON.stringify({ joined: true }));
}

export async function handlePostEvents(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const auth = requireAuth(req);
  if (!auth) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "title required" }));
    return;
  }
  const startTime = typeof body.startTime === "number" ? body.startTime : typeof body.start_time === "number" ? body.start_time : Date.now();
  const endTime = typeof body.endTime === "number" ? body.endTime : typeof body.end_time === "number" ? body.end_time : startTime + 24 * 60 * 60 * 1000;
  const description = typeof body.description === "string" ? body.description : undefined;
  const status = body.status as "draft" | "active" | "ended" | "cancelled" | undefined;
  const event = createEvent({
    title,
    description,
    startTime,
    endTime,
    status: status ?? "draft",
  });
  res.setHeader("Content-Type", "application/json");
  res.writeHead(201);
  res.end(JSON.stringify(event));
}

export async function handlePatchEvent(
  req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): Promise<void> {
  const auth = requireAuth(req);
  if (!auth) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const event = getEvent(eventId);
  if (!event) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Event not found" }));
    return;
  }
  const body = await parseBody(req);
  const ok = updateEvent(eventId, {
    title: typeof body.title === "string" ? body.title : undefined,
    description: typeof body.description === "string" ? body.description : body.description === null ? null : undefined,
    startTime: typeof body.startTime === "number" ? body.startTime : undefined,
    endTime: typeof body.endTime === "number" ? body.endTime : undefined,
    status: body.status as "draft" | "active" | "ended" | "cancelled" | undefined,
  });
  res.setHeader("Content-Type", "application/json");
  if (!ok) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Update failed" }));
    return;
  }
  const updated = getEvent(eventId);
  res.writeHead(200);
  res.end(JSON.stringify(updated));
}
