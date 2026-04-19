// src/web/api/profile.ts
// GET /api/profile/:userId — profile for Discord and web (uses profileService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getContextLogger } from "../../services/core/logging/requestContext.js";
import { getProfile } from "../../services/platform/profileService.js";

export function handleGetProfile(
  _req: IncomingMessage,
  res: ServerResponse,
  userId: string,
): void {
  const log = getContextLogger();
  const profile = getProfile(userId);
  res.setHeader("Content-Type", "application/json");
  if (!profile) {
    log.warn({ userId }, "[web/profile] profile not found");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Profile not found" }));
    return;
  }
  log.debug({ userId }, "[web/profile] fetched profile");
  res.writeHead(200);
  res.end(JSON.stringify(profile));
}
