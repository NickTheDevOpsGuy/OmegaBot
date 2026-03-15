// src/web/api/profile.ts
// GET /api/profile/:userId — profile for Discord and web (uses profileService).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getProfile } from "../../services/platform/profileService.js";

export async function handleGetProfile(
  _req: IncomingMessage,
  res: ServerResponse,
  userId: string,
): Promise<void> {
  const profile = getProfile(userId);
  res.setHeader("Content-Type", "application/json");
  if (!profile) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Profile not found" }));
    return;
  }
  res.writeHead(200);
  res.end(JSON.stringify(profile));
}
