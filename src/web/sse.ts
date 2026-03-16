// src/web/sse.ts
// Server-Sent Events for live game/event updates. Clients subscribe by topic (game:gameId or event:eventId).

import type { ServerResponse } from "node:http";

const subscribers = new Map<string, Set<ServerResponse>>();

function getTopic(key: "game" | "event", id: string): string {
  return `${key}:${id}`;
}

export function subscribe(topic: string, res: ServerResponse): void {
  let set = subscribers.get(topic);
  if (!set) {
    set = new Set();
    subscribers.set(topic, set);
  }
  set.add(res);
  res.on("close", () => {
    set?.delete(res);
    if (set?.size === 0) subscribers.delete(topic);
  });
}

export function publish(key: "game" | "event", id: string, data: unknown): void {
  const topic = getTopic(key, id);
  const set = subscribers.get(topic);
  if (!set) return;
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const msg = `data: ${payload}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      set.delete(res);
    }
  }
}

export function handleSse(
  req: import("node:http").IncomingMessage,
  res: ServerResponse,
): void {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const gameId = url.searchParams.get("gameId");
  const eventId = url.searchParams.get("eventId");
  const topic = gameId
    ? getTopic("game", gameId)
    : eventId
      ? getTopic("event", eventId)
      : null;
  if (!topic) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "gameId or eventId query param required" }));
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.writeHead(200);
  res.write(`data: ${JSON.stringify({ type: "connected", topic })}\n\n`);
  subscribe(topic, res);
}
