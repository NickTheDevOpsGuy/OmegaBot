// src/web/authRoutes.ts
// Discord OAuth: GET /auth/discord (redirect), GET /auth/discord/callback (exchange code, create session, set cookie).

import type { IncomingMessage, ServerResponse } from "node:http";
import { getOrCreateByDiscord } from "../services/platform/userService.js";
import { createSession } from "./auth.js";
import { logger } from "../utils/logger.js";

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_ME_URL = "https://discord.com/api/users/@me";
const SESSION_COOKIE_NAME = "session_id";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function getRedirectUri(req: IncomingMessage): string {
  const host = req.headers.host ?? "localhost:4000";
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${proto}://${host}/auth/discord/callback`;
}

export function handleAuthDiscordRedirect(req: IncomingMessage, res: ServerResponse): void {
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  if (!clientId) {
    logger.warn("[web/auth] Discord OAuth redirect without DISCORD_OAUTH_CLIENT_ID");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(500);
    res.end(JSON.stringify({ error: "OAuth not configured (DISCORD_OAUTH_CLIENT_ID)" }));
    return;
  }
  const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI || getRedirectUri(req);
  const scope = "identify";
  const url = `${DISCORD_OAUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.writeHead(302, { Location: url });
  res.end();
}

export async function handleAuthDiscordCallback(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const code = url.searchParams.get("code");
  const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
  const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) {
    logger.debug("[web/auth] callback missing code or OAuth config");
    res.writeHead(302, { Location: "/?error=oauth_config" });
    res.end();
    return;
  }
  const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI || getRedirectUri(req);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  let tokenRes: Response;
  try {
    tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    logger.error({ err }, "[web/auth] token exchange fetch threw");
    res.writeHead(302, { Location: "/?error=token_exchange" });
    res.end();
    return;
  }
  if (!tokenRes.ok) {
    logger.warn({ status: tokenRes.status }, "[web/auth] token exchange non-OK");
    res.writeHead(302, { Location: "/?error=token_exchange" });
    res.end();
    return;
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    logger.warn("[web/auth] token response missing access_token");
    res.writeHead(302, { Location: "/?error=no_token" });
    res.end();
    return;
  }
  let meRes: Response;
  try {
    meRes = await fetch(DISCORD_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    logger.error({ err }, "[web/auth] user fetch threw");
    res.writeHead(302, { Location: "/?error=user_fetch" });
    res.end();
    return;
  }
  if (!meRes.ok) {
    logger.warn({ status: meRes.status }, "[web/auth] user fetch non-OK");
    res.writeHead(302, { Location: "/?error=user_fetch" });
    res.end();
    return;
  }
  const user = (await meRes.json()) as { id: string; username?: string; avatar?: string };
  const discordId = user.id;
  const username = user.username ?? discordId;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png`
    : null;
  const platformUser = getOrCreateByDiscord(discordId, username, avatarUrl);
  const sessionId = createSession(platformUser.userId);
  logger.info({ userId: platformUser.userId }, "[web/auth] OAuth login success");
  const appUrl = process.env.WEB_APP_URL || "/";
  res.writeHead(302, {
    Location: appUrl,
    "Set-Cookie": `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`,
  });
  res.end();
}
