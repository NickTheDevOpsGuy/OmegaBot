// src/web/server.ts
//
// Lightweight HTTP API for future web platform. Start with: node dist/web/server.js
// Requires DATABASE_PATH and optional WEB_API_PORT (default 4000).
// Discord bot and this API share the same database and services.

import http from "node:http";
import { fileURLToPath } from "node:url";
import { initDatabase } from "../services/core/database/db.js";
import { handleGetProfile } from "./api/profile.js";
import { handleGetLeaderboard } from "./api/leaderboard.js";
import { handleGetEvents, handleGetEvent, handlePostEventsJoin } from "./api/events.js";
import { handleGetGameState, handlePostGameMove } from "./api/games.js";

const PORT = parseInt(process.env.WEB_API_PORT ?? "4000", 10);

function notFound(res: http.ServerResponse): void {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
}

async function route(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  path: string,
  method: string,
): Promise<void> {
  const segments = path.replace(/^\/+|\/+$/g, "").split("/");
  if (segments[0] !== "api") {
    notFound(res);
    return;
  }

  if (segments[1] === "profile" && segments[2]) {
    await handleGetProfile(req, res, segments[2]);
    return;
  }
  if (segments[1] === "leaderboard") {
    await handleGetLeaderboard(req, res);
    return;
  }
  if (segments[1] === "events") {
    if (segments[3] === "join" && method === "POST" && segments[2]) {
      await handlePostEventsJoin(req, res, segments[2]);
      return;
    }
    if (segments[2] && segments[2] !== "join") {
      await handleGetEvent(req, res, segments[2]);
      return;
    }
    await handleGetEvents(req, res);
    return;
  }
  if (segments[1] === "games") {
    if (segments[2] === "state" && segments[3]) {
      await handleGetGameState(req, res, segments[3]);
      return;
    }
    if (segments[2] === "move" && method === "POST") {
      const body = await parseBody(req);
      const gameId = body.gameId as string | undefined;
      if (!gameId) {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(400);
        res.end(JSON.stringify({ error: "gameId required in body" }));
        return;
      }
      await handlePostGameMove(res, gameId, body);
      return;
    }
  }

  notFound(res);
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  await route(req, res, url.pathname, req.method ?? "GET");
});

export function startWebApi(): void {
  initDatabase();
  server.listen(PORT, () => {
    console.info(`Web API listening on port ${PORT}`);
  });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith("web/server.js")) {
  startWebApi();
}
