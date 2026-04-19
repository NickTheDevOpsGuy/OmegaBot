// src/web/api/games.ts
// GET /api/games/state/:gameId, POST /api/games/move (uses gameEngine + sessionManager).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getContextLogger } from "../../services/core/logging/requestContext.js";
import { getGameState, applyGameMove } from "../../services/games/gameEngine.js";
import { publish } from "../sse.js";

export function handleGetGameState(
  _req: IncomingMessage,
  res: ServerResponse,
  gameId: string,
): void {
  const log = getContextLogger();
  const state = getGameState(gameId);
  res.setHeader("Content-Type", "application/json");
  if (!state) {
    log.warn({ gameId }, "[web/games] game state not found");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Game not found or expired" }));
    return;
  }
  log.debug({ gameId }, "[web/games] fetched game state");
  res.writeHead(200);
  res.end(JSON.stringify(state));
}

export function handlePostGameMove(
  res: ServerResponse,
  gameId: string,
  body: Record<string, unknown>,
): void {
  const log = getContextLogger();
  const userId = body.userId as string | undefined;
  const col = body.col as number | undefined;
  if (!userId) {
    log.warn({ gameId }, "[web/games] move rejected, missing userId");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const result = applyGameMove(gameId, userId, { col });
  res.setHeader("Content-Type", "application/json");
  if (!result.ok) {
    log.warn({ gameId, userId, col, error: result.error }, "[web/games] move rejected");
    res.writeHead(400);
    res.end(JSON.stringify({ error: result.error }));
    return;
  }
  publish("game", gameId, getGameState(gameId));
  log.info(
    {
      gameId,
      userId,
      col: typeof col === "number" ? col : null,
      winner: (result as { winner?: string }).winner ?? null,
      draw: (result as { draw?: boolean }).draw ?? false,
    },
    "[web/games] applied move",
  );
  res.writeHead(200);
  res.end(
    JSON.stringify({
      ok: true,
      winner: (result as { winner?: string }).winner,
      draw: (result as { draw?: boolean }).draw,
    }),
  );
}
