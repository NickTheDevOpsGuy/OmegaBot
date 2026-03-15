// src/web/api/events.ts
// GET /api/events, GET /api/events/:id, POST /api/events/join (uses eventsService).

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  listEvents,
  getEvent,
  getEventParticipants,
  joinEvent,
} from "../../services/platform/eventsService.js";

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
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
  res.writeHead(200);
  res.end(JSON.stringify({ joined: true }));
}
