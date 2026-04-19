// src/web/api/leaderboard.ts
// GET /api/leaderboard — usage or per-game leaderboard (uses leaderboardService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getContextLogger } from "../../services/core/logging/requestContext.js";
import {
  getUsageLeaderboard,
  getGameLeaderboard,
} from "../../services/platform/leaderboardService.js";

export async function handleGetLeaderboard(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const log = getContextLogger();
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const scope = url.searchParams.get("scope") ?? "users";
  const gameType = url.searchParams.get("game") ?? "";
  const guildId =
    url.searchParams.get("guildId") ?? url.searchParams.get("guild_id") ?? undefined;
  const window = url.searchParams.get("window") ?? undefined;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam ? parseInt(fromParam, 10) : undefined;
  const to = toParam ? parseInt(toParam, 10) : undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25);

  res.setHeader("Content-Type", "application/json");
  try {
    if (gameType) {
      const data = getGameLeaderboard(gameType, { limit, guildId: guildId ?? null });
      log.debug(
        { scope, gameType, guildId: guildId ?? null, limit, resultCount: data.length },
        "[web/leaderboard] fetched game leaderboard",
      );
      res.writeHead(200);
      res.end(JSON.stringify({ entries: data }));
      return;
    }
    const data = await getUsageLeaderboard({
      scope: scope === "commands" ? "commands" : "users",
      limit,
      from: Number.isFinite(from) ? from : undefined,
      to: Number.isFinite(to) ? to : undefined,
      guildId: guildId ?? null,
      window: window === "weekly" ? "weekly" : undefined,
    });
    log.debug(
      {
        scope,
        guildId: guildId ?? null,
        limit,
        from: Number.isFinite(from) ? from : null,
        to: Number.isFinite(to) ? to : null,
        window: window ?? null,
        resultCount: Array.isArray(data) ? data.length : 0,
      },
      "[web/leaderboard] fetched usage leaderboard",
    );
    res.writeHead(200);
    res.end(
      JSON.stringify(scope === "commands" ? { commands: data } : { entries: data }),
    );
  } catch (err) {
    log.error({ err, scope, gameType, guildId }, "[web/leaderboard] request failed");
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Leaderboard unavailable" }));
  }
}
