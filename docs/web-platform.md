# Web platform support (Phase 15)

OmegaBot is structured so the same backend can power **Discord** and a **future web UI**. Game logic, progression, events, and profiles live in shared services; Discord commands and the web API both call these services.

## Table of Contents

- [Setting up the website](#setting-up-the-website)
- [Architecture](#architecture)
- [User accounts](#user-accounts)
- [Events](#events)
- [Posts / social feed](#posts--social-feed)
- [Persistent games](#persistent-games)
- [Game API layer](#game-api-layer)
- [Web API](#web-api)
- [Leaderboards](#leaderboards)
- [Achievements](#achievements)
- [Profiles](#profiles)
- [Real-time (SSE)](#real-time-sse)
- [Implemented features (roadmap done)](#implemented-features-roadmap-done)

---

## Setting up the website

Follow these steps to run the Web API and optionally connect a frontend.

### 1. Prerequisites

- Same as the Discord bot: Node.js 18+ (22 LTS recommended), `npm install`, and a working SQLite database.
- The Web API uses the **same database** as the bot (`DATABASE_PATH`). Run migrations if needed (they run on bot/API startup).

### 2. Environment

- **`DATABASE_PATH`** — Path to your SQLite DB (e.g. `data/omegabot.db`). Same as the bot so profiles, games, and events are shared.
- **`WEB_API_PORT`** (optional) — Port for the HTTP server. Default: `4000`.

No Discord token is required to run the API alone. To use the bot and website together, run the bot as usual and run the API in a separate process (or same machine, different port).

### 3. Run the Web API

```bash
cd OmegaBot
npm run build
npm run api
```

Or run the built server directly:

```bash
node dist/web/server.js
```

The server listens on `http://localhost:4000` (or your `WEB_API_PORT`). You can hit endpoints with `curl`, e.g.:

```bash
curl http://localhost:4000/api/profile/YOUR_USER_ID
curl "http://localhost:4000/api/leaderboard?scope=users&limit=10"
```

### 4. Build a frontend (optional)

- Use any frontend (React, Vue, static HTML, etc.) that can call the API.
- Base URL: `http://localhost:4000` in development, or your deployed API URL in production.
- **Auth:** Use `WEB_API_KEY` (X-API-Key header) or Discord OAuth (`/auth/discord` → callback sets session cookie). See [User accounts](#user-accounts) and env vars in [Environment Setup](setup-env.md).

### 5. Deploying

- Run the API as a separate process (e.g. systemd, Docker, or PaaS). Point `DATABASE_PATH` to the same DB the bot uses (or a copy if you run bot and API on different machines and sync data).
- Put a reverse proxy (e.g. nginx, Caddy) in front for HTTPS and optional rate limiting.
- Frontend can be served from the same host (static files) or a separate domain; ensure CORS is configured if the frontend origin differs from the API.

---

## Architecture

```
Discord Bot (commands, buttons, embeds)
         │
         ▼
Shared services (games, progression, platform)
         │
    Database (SQLite)
         │
         ▼
Web API (HTTP JSON)
         │
         ▼
Future web frontend
```

- **Discord** remains the primary client; commands stay thin and call services.
- **Web API** is an optional HTTP server that exposes the same data for a browser client.
- **Real-time:** SSE at `GET /api/sse?gameId=...` or `?eventId=...` streams live game/event updates.

## User accounts

- **Table:** `platform_users` (migration `010_platform_users.sql`): `user_id` (UUID), `discord_id` (unique), `username`, `avatar_url`, `created_at`, `updated_at`.
- **Service:** `services/platform/userService.ts`
  - `getOrCreateByDiscord(discordId, username?, avatarUrl?)` — ensure a platform user for a Discord account; update name/avatar.
  - `getPlatformUser(userIdOrDiscordId)` — fetch by internal id or Discord id.
  - `resolveDiscordId(userIdOrDiscordId)` — resolve to a Discord id for use with existing game/progression tables (keyed by Discord id).
- **Discord OAuth:** `GET /auth/discord` redirects to Discord; `GET /auth/discord/callback` exchanges the code, calls `getOrCreateByDiscord`, creates a session, and sets a cookie. Set `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, and optionally `DISCORD_OAUTH_REDIRECT_URI`, `WEB_APP_URL`.

## Events

- **Tables:** `events`, `event_participants` (migration `011_events.sql`).
- **Service:** `services/platform/eventsService.ts`
  - Create, get, list (by status), join, get participants, update status.
- **Discord:** `/event create`, `/event update`, `/event join`, `/event list`, `/event results`.
- **Web:** GET/POST/PATCH events, join via API; SSE for live event updates.

## Posts / social feed

- **Tables:** `posts`, `post_likes` (migration `012_posts.sql`).
- **Service:** `services/platform/postsService.ts`
  - Create, get, list (global or by author), like, unlike.
- **API:** `POST /api/posts` (auth), `GET /api/posts`, `GET /api/posts/:id` (with comments), `GET/POST /api/posts/:id/comments`. Optional Discord cross-post later.

## Persistent games

- **Sessions:** `game_sessions` (see [Games development](games-development.md)); status `active` | `finished` | `abandoned`.
- **Service:** `services/games/sessionManager.ts` + `services/games/gameEngine.ts`
  - `getGameState(gameId)` — for API/Discord.
  - `applyGameMove(gameId, userId, payload)` — e.g. Connect 4 column; returns `{ ok, winner?, draw? }`.
- Games started on Discord can be continued on the web (and vice versa) by calling the same services.

## Game API layer

- **`services/games/gameEngine.ts`** — facade for state and moves; used by web API and can be used by Discord.
- **`services/games/progressionEngine.ts`** — XP, levels, progression result.
- **`services/games/sessionManager.ts`** — persistent sessions, expiry, status.
- Commands (e.g. Connect 4) already use these or equivalent logic; the web API calls `gameEngine` and `sessionManager`.

## Web API

Optional HTTP server: **`src/web/server.ts`**. Start with `npm run api` (or `node dist/web/server.js`). Set `WEB_API_PORT` (default `4000`) and `DATABASE_PATH` as needed. The server calls `initDatabase()` and the same services as the bot. For full setup steps, see [Setting up the website](#setting-up-the-website) above.

### Endpoints (scaffold)

| Method | Path                          | Description                                                                                                    |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/profile/:userId`        | Profile (xp, level, games, wins, achievements, daily streak). `userId` = platform user_id or Discord id.       |
| GET    | `/api/leaderboard`            | Usage leaderboard. Query: `scope=users` or `commands`, `limit`.                                                |
| GET    | `/api/leaderboard?game=slots` | Per-game leaderboard (e.g. `game=slots`, `game=daily`).                                                        |
| GET    | `/api/events`                 | List events. Query: `status=active` or `ended`, `limit`.                                                       |
| GET    | `/api/events/:id`             | Single event + participants.                                                                                   |
| POST   | `/api/events/:id/join`        | Body: `{ "userId": "..." }`. Join event.                                                                       |
| GET    | `/api/games/state/:gameId`    | Game state (board, turn, status, expiresAt).                                                                   |
| POST   | `/api/games/move`             | Body: `{ "gameId", "userId", "col" }`. Apply move (e.g. Connect 4).                                            |
| GET    | `/api/sse`                    | Query: `gameId=...` or `eventId=...`. Server-Sent Events stream for live updates.                              |
| GET    | `/auth/discord`               | Redirect to Discord OAuth.                                                                                     |
| GET    | `/auth/discord/callback`      | OAuth callback; sets session cookie and redirects to `WEB_APP_URL`.                                            |
| GET    | `/api/posts`                  | List posts. Query: `authorId`, `limit`.                                                                        |
| POST   | `/api/posts`                  | Create post (auth). Body: `content`, optional `attachments`, optional `userId` (when using API key).           |
| GET    | `/api/posts/:id`              | Single post with comments.                                                                                     |
| GET    | `/api/posts/:id/comments`     | List comments. Query: `limit`.                                                                                 |
| POST   | `/api/posts/:id/comments`     | Add comment (auth). Body: `content`, optional `userId`.                                                        |
| POST   | `/api/events`                 | Create event (auth). Body: `title`, `description?`, `startTime`/`start_time`, `endTime`/`end_time`, `status?`. |
| PATCH  | `/api/events/:id`             | Update event (auth). Body: `title?`, `description?`, `startTime?`, `endTime?`, `status?`.                      |
| GET    | `/api/achievements`           | List all achievement definitions (id, name, description, emoji, category).                                     |

Responses are JSON (except SSE). Auth: `Authorization: Bearer <sessionId>`, cookie `session_id` (after Discord OAuth), or `X-API-Key` (set `WEB_API_KEY`). Write endpoints (POST posts, POST/PATCH events, POST comments) require auth.

## Leaderboards

- **Usage:** `leaderboardService.getUsageLeaderboard({ scope: "users"|"commands", limit })` — from fun usage store.
- **Per-game:** `leaderboardService.getGameLeaderboard(gameType, { limit })` — e.g. slots, daily; extend for more games.
- **Scopes:** Global (default), **weekly** (`?window=weekly`), **server** (`?guildId=...`). Usage is logged to `usage_log` (migration 014) with `guild_id` when recording from Discord.

## Achievements

- **Definitions:** `commands/games/achievements/definitions.ts` (id, title, description, xpReward, icon, checkFn).
- **Unlock state:** Stored implicitly via game stats and progression; profile and achievements embed use the same checks.
- **Web:** `GET /api/profile/:userId` includes `achievements` (array of `{ id, name, description, emoji, category, unlocked }`). `GET /api/achievements` returns all definitions.

## Profiles

- **Service:** `services/platform/profileService.ts` — `getProfile(userIdOrDiscordId)`.
- Returns: username, avatarUrl, xp, level, gamesPlayed, wins, winRate, achievements, daily streak.
- **Discord:** `/profile view` uses the same data (via profileHelpers + progression + gameStats).
- **Web:** `GET /api/profile/:userId` returns the same shape.

## Real-time (SSE)

- Services are stateless and keyed by id; a WebSocket or SSE layer can subscribe to “game updates” or “event updates” and push from the same service layer.
- Sessions are in-memory; WebSocket could be added later for bidirectional use.

## Implemented features (roadmap done)

The following are implemented:

- **Discord OAuth:** `GET /auth/discord` and `GET /auth/discord/callback`; session cookie; env: `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URI`, `WEB_APP_URL`.
- **Auth middleware:** Session (cookie or `Authorization: Bearer <sessionId>`) and API key (`X-API-Key`, `WEB_API_KEY`). Write endpoints require auth; `userId` from session or body when using API key.
- **POST /api/posts and GET /api/posts:** Create (auth), list with `authorId`, `limit`. **Comments:** `post_comments` table (migration 013), `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments` (auth).
- **Event create/update:** `POST /api/events`, `PATCH /api/events/:id` (auth). Discord: `/event create`, `/event update`, `/event join`, `/event list`, `/event results`.
- **Weekly leaderboard:** `GET /api/leaderboard?window=weekly`. **Date range:** `from`, `to` (Unix ms). **Server leaderboard:** `?guildId=...`. Usage is logged to `usage_log` (migration 014) with `guild_id` when recording from Discord.
- **SSE:** `GET /api/sse?gameId=...` or `?eventId=...` streams live updates when a move or event join occurs.
- **Achievement badges:** `GET /api/achievements` returns all definitions. `GET /api/profile/:userId` includes `achievements: { id, name, description, emoji, category, unlocked }[]`.
