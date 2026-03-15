// src/web/api/leaderboard.ts
// GET /api/leaderboard — usage or per-game leaderboard (uses leaderboardService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getUsageLeaderboard, getGameLeaderboard } from "../../services/platform/leaderboardService.js";

export async function handleGetLeaderboard(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const scope = url.searchParams.get("scope") ?? "users";
  const gameType = url.searchParams.get("game") ?? "";
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25);

  res.setHeader("Content-Type", "application/json");
  try {
    if (gameType) {
      const data = getGameLeaderboard(gameType, { limit });
      res.writeHead(200);
      res.end(JSON.stringify({ entries: data }));
      return;
    }
    const data = await getUsageLeaderboard({
      scope: scope === "commands" ? "commands" : "users",
      limit,
    });
    res.writeHead(200);
    res.end(JSON.stringify(scope === "commands" ? { commands: data } : { entries: data }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Leaderboard unavailable" }));
  }
}
