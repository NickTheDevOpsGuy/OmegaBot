// src/web/server.ts
//
// Lightweight HTTP API for future web platform. Start with: node dist/web/server.js
// Requires DATABASE_PATH and optional WEB_API_PORT (default 4000).
// Discord bot and this API share the same database and services.

import http from "node:http";
import { fileURLToPath } from "node:url";
import { initDatabase } from "../services/core/database/db.js";
import { logger } from "../utils/logger.js";
import { handleGetProfile } from "./api/profile.js";
import { handleGetLeaderboard } from "./api/leaderboard.js";
import {
  handleGetEvents,
  handleGetEvent,
  handlePostEventsJoin,
  handlePostEvents,
  handlePatchEvent,
} from "./api/events.js";
import { handleGetGameState, handlePostGameMove } from "./api/games.js";
import {
  handleGetPosts,
  handleGetPost,
  handlePostPost,
  handleGetPostComments,
  handlePostPostComment,
} from "./api/posts.js";
import { handleGetAchievements } from "./api/achievements.js";
import { handleSse } from "./sse.js";
import { handleAuthDiscordRedirect, handleAuthDiscordCallback } from "./authRoutes.js";
import { checkAuthRateLimit, checkWriteRateLimit } from "./rateLimit.js";

const PORT = parseInt(process.env.WEB_API_PORT ?? "4000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*"; // Use specific origin in production

function getRequestId(req: http.IncomingMessage): string {
  const id = req.headers["x-request-id"];
  if (typeof id === "string" && id.trim()) return id.trim().slice(0, 64);
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setCommonHeaders(res: http.ServerResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  if (CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, X-Request-Id",
  );
}

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

  // Auth (non-/api) — rate limited
  if (segments[0] === "auth" && segments[1] === "discord") {
    const authLimit = checkAuthRateLimit(req);
    if (!authLimit.allowed) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Retry-After",
        String(Math.ceil((authLimit.resetAt - Date.now()) / 1000)),
      );
      res.writeHead(429);
      res.end(
        JSON.stringify({
          error: "Too many auth attempts",
          retryAfter: Math.ceil((authLimit.resetAt - Date.now()) / 1000),
        }),
      );
      return;
    }
    if (segments[2] === "callback") {
      await handleAuthDiscordCallback(req, res);
      return;
    }
    handleAuthDiscordRedirect(req, res);
    return;
  }

  if (segments[0] !== "api") {
    notFound(res);
    return;
  }

  // SSE
  if (segments[1] === "sse" && method === "GET") {
    handleSse(req, res);
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
  if (segments[1] === "achievements") {
    await handleGetAchievements(req, res);
    return;
  }
  if (segments[1] === "posts") {
    if (segments[2] && segments[2] !== "comments") {
      const postId = segments[2];
      if (segments[3] === "comments") {
        if (method === "POST") {
          const w = checkWriteRateLimit(req);
          if (!w.allowed) {
            res.setHeader("Content-Type", "application/json");
            res.setHeader(
              "Retry-After",
              String(Math.ceil((w.resetAt - Date.now()) / 1000)),
            );
            res.writeHead(429);
            res.end(
              JSON.stringify({
                error: "Too many requests",
                retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
              }),
            );
            return;
          }
          await handlePostPostComment(req, res, postId);
        } else await handleGetPostComments(req, res, postId);
        return;
      }
      if (method === "GET") {
        await handleGetPost(req, res, postId);
        return;
      }
    }
    if (method === "POST") {
      const w = checkWriteRateLimit(req);
      if (!w.allowed) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(Math.ceil((w.resetAt - Date.now()) / 1000)));
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
          }),
        );
        return;
      }
      await handlePostPost(req, res);
      return;
    }
    await handleGetPosts(req, res);
    return;
  }
  if (segments[1] === "events") {
    if (method === "POST" && !segments[2]) {
      const w = checkWriteRateLimit(req);
      if (!w.allowed) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(Math.ceil((w.resetAt - Date.now()) / 1000)));
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
          }),
        );
        return;
      }
      await handlePostEvents(req, res);
      return;
    }
    if (segments[3] === "join" && method === "POST" && segments[2]) {
      const w = checkWriteRateLimit(req);
      if (!w.allowed) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(Math.ceil((w.resetAt - Date.now()) / 1000)));
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
          }),
        );
        return;
      }
      await handlePostEventsJoin(req, res, segments[2]);
      return;
    }
    if (method === "PATCH" && segments[2]) {
      const w = checkWriteRateLimit(req);
      if (!w.allowed) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(Math.ceil((w.resetAt - Date.now()) / 1000)));
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
          }),
        );
        return;
      }
      await handlePatchEvent(req, res, segments[2]);
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
      const w = checkWriteRateLimit(req);
      if (!w.allowed) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(Math.ceil((w.resetAt - Date.now()) / 1000)));
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Too many requests",
            retryAfter: Math.ceil((w.resetAt - Date.now()) / 1000),
          }),
        );
        return;
      }
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
      } catch (err) {
        logger.warn({ err }, "[web] parseBody JSON parse failed, using {}");
        resolve({});
      }
    });
    req.on("error", (err) => {
      logger.debug({ err }, "[web] parseBody request error");
      reject(err);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const requestId = getRequestId(req);
  setCommonHeaders(res, requestId);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const method = req.method ?? "GET";
  const path = url.pathname;
  const start = Date.now();
  let logged = false;
  const onFinish = (): void => {
    if (logged) return;
    logged = true;
    const status = res.statusCode;
    const ms = Date.now() - start;
    if (status >= 500)
      logger.error({ requestId, method, path, status, ms }, "[web] request");
    else logger.debug({ requestId, method, path, status, ms }, "[web] request");
  };
  res.once("finish", onFinish);
  res.once("close", onFinish);
  try {
    await route(req, res, path, method);
  } catch (err) {
    logger.error({ err, requestId, method, path }, "[web] route handler threw");
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

export function startWebApi(): void {
  initDatabase();
  server.listen(PORT, () => {
    logger.info({ port: PORT }, "[web] API listening");
  });
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith("web/server.js")) {
  startWebApi();
}
