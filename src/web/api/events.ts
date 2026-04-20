// src/web/api/events.ts
// GET /api/events, GET /api/events/:id, POST /api/events/join (uses eventsService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getContextLogger } from "../../services/core/logging/requestContext.js";
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
      } catch (err) {
        getContextLogger().warn(
          { err, bodyLength: body.length },
          "[web/events] invalid JSON body, using empty object",
        );
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export function handleGetEvents(_req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(_req.url ?? "", `http://${_req.headers.host}`);
  const status = url.searchParams.get("status") as "active" | "ended" | undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50);
  const events = listEvents({ status, limit });
  getContextLogger().debug(
    { status, limit, resultCount: events.length },
    "[web/events] listed events",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ events }));
}

export function handleGetEvent(
  _req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): void {
  const log = getContextLogger();
  const event = getEvent(eventId);
  res.setHeader("Content-Type", "application/json");
  if (!event) {
    log.warn({ eventId }, "[web/events] event not found");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Event not found" }));
    return;
  }
  const participants = getEventParticipants(eventId);
  log.debug(
    { eventId, participantCount: participants.length },
    "[web/events] fetched event details",
  );
  res.writeHead(200);
  res.end(JSON.stringify({ ...event, participants }));
}

export async function handlePostEventsJoin(
  req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): Promise<void> {
  const log = getContextLogger();
  const body = await parseBody(req);
  const userId = body.userId as string | undefined;
  if (!userId) {
    log.warn({ eventId }, "[web/events] join missing userId");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const ok = joinEvent(eventId, userId);
  res.setHeader("Content-Type", "application/json");
  if (!ok) {
    log.warn({ eventId, userId }, "[web/events] join failed");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Could not join event (invalid or not active)" }));
    return;
  }
  const { publish } = await import("../sse.js");
  const event = getEvent(eventId);
  const participants = getEventParticipants(eventId);
  publish("event", eventId, { ...event, participants });
  log.info(
    { eventId, userId, participantCount: participants.length },
    "[web/events] participant joined",
  );
  res.writeHead(200);
  res.end(JSON.stringify({ joined: true }));
}

export async function handlePostEvents(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const log = getContextLogger();
  const auth = requireAuth(req);
  if (!auth) {
    log.warn("[web/events] create rejected, missing auth");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    log.warn("[web/events] create rejected, missing title");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "title required" }));
    return;
  }
  const startTime =
    typeof body.startTime === "number"
      ? body.startTime
      : typeof body.start_time === "number"
        ? body.start_time
        : Date.now();
  const endTime =
    typeof body.endTime === "number"
      ? body.endTime
      : typeof body.end_time === "number"
        ? body.end_time
        : startTime + 24 * 60 * 60 * 1000;
  const description = typeof body.description === "string" ? body.description : undefined;
  const status = body.status as "draft" | "active" | "ended" | "cancelled" | undefined;
  const event = createEvent({
    title,
    description,
    startTime,
    endTime,
    status: status ?? "draft",
  });
  log.info(
    {
      eventId: event.eventId,
      status: event.status,
      authType: auth.type,
      titleLength: title.length,
    },
    "[web/events] created event",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(201);
  res.end(JSON.stringify(event));
}

export async function handlePatchEvent(
  req: IncomingMessage,
  res: ServerResponse,
  eventId: string,
): Promise<void> {
  const log = getContextLogger();
  const auth = requireAuth(req);
  if (!auth) {
    log.warn({ eventId }, "[web/events] patch rejected, missing auth");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const event = getEvent(eventId);
  if (!event) {
    log.warn({ eventId }, "[web/events] patch target not found");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Event not found" }));
    return;
  }
  const body = await parseBody(req);
  const ok = updateEvent(eventId, {
    title: typeof body.title === "string" ? body.title : undefined,
    description:
      typeof body.description === "string"
        ? body.description
        : body.description === null
          ? null
          : undefined,
    startTime: typeof body.startTime === "number" ? body.startTime : undefined,
    endTime: typeof body.endTime === "number" ? body.endTime : undefined,
    status: body.status as "draft" | "active" | "ended" | "cancelled" | undefined,
  });
  res.setHeader("Content-Type", "application/json");
  if (!ok) {
    log.warn({ eventId, authType: auth.type }, "[web/events] patch failed");
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Update failed" }));
    return;
  }
  const updated = getEvent(eventId);
  log.info(
    { eventId, authType: auth.type, status: updated?.status ?? null },
    "[web/events] updated event",
  );
  res.writeHead(200);
  res.end(JSON.stringify(updated));
}
