// src/web/api/games.ts
// GET /api/games/state/:gameId, POST /api/games/move (uses gameEngine + sessionManager).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getGameState, applyGameMove } from "../../services/games/gameEngine.js";

export async function handleGetGameState(
  _req: IncomingMessage,
  res: ServerResponse,
  gameId: string,
): Promise<void> {
  const state = getGameState(gameId);
  res.setHeader("Content-Type", "application/json");
  if (!state) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Game not found or expired" }));
    return;
  }
  res.writeHead(200);
  res.end(JSON.stringify(state));
}

export async function handlePostGameMove(
  res: ServerResponse,
  gameId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const userId = body.userId as string | undefined;
  const col = body.col as number | undefined;
  if (!userId) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const result = applyGameMove(gameId, userId, { col });
  res.setHeader("Content-Type", "application/json");
  if (!result.ok) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: result.error }));
    return;
  }
  res.writeHead(200);
  res.end(
    JSON.stringify({
      ok: true,
      winner: (result as { winner?: string }).winner,
      draw: (result as { draw?: boolean }).draw,
    }),
  );
}
