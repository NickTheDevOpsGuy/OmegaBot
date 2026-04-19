// src/web/api/achievements.ts
// GET /api/achievements — list all achievement definitions (id, name, description, emoji, category).

import type { IncomingMessage, ServerResponse } from "node:http";
import { ACHIEVEMENTS } from "../../commands/games/achievements/achievements.js";
import { getContextLogger } from "../../services/core/logging/requestContext.js";

export function handleGetAchievements(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  const list = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    emoji: a.emoji,
    category: a.category,
  }));
  getContextLogger().debug(
    { achievementCount: list.length },
    "[web/achievements] listed achievements",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ achievements: list }));
}
