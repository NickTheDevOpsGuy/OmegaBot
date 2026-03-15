# Web platform support (Phase 15)

OmegaBot is structured so the same backend can power **Discord** and a **future web UI**. Game logic, progression, events, and profiles live in shared services; Discord commands and the web API both call these services.

## Setting up the website

Follow these steps to run the Web API and optionally connect a frontend.

### 1. Prerequisites

- Same as the Discord bot: Node.js 18+ (20 recommended), `npm install`, and a working SQLite database.
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
- **Auth:** The API has no auth yet. When you add a real site, add API keys or Discord OAuth and use `userService.getOrCreateByDiscord` to link accounts. See [User accounts](#user-accounts) and [Future TODOs](#future-todos).

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
- **Real-time** (WebSockets / SSE) is not implemented yet; services are structured so a real-time layer can be added later.

## User accounts

- **Table:** `platform_users` (migration `010_platform_users.sql`): `user_id` (UUID), `discord_id` (unique), `username`, `avatar_url`, `created_at`, `updated_at`.
- **Service:** `services/platform/userService.ts`
  - `getOrCreateByDiscord(discordId, username?, avatarUrl?)` — ensure a platform user for a Discord account; update name/avatar.
  - `getPlatformUser(userIdOrDiscordId)` — fetch by internal id or Discord id.
  - `resolveDiscordId(userIdOrDiscordId)` — resolve to a Discord id for use with existing game/progression tables (keyed by Discord id).
- **Future:** Discord OAuth on the website can call `getOrCreateByDiscord` after login so web and Discord share one profile.

## Events

- **Tables:** `events`, `event_participants` (migration `011_events.sql`).
- **Service:** `services/platform/eventsService.ts`
  - Create, get, list (by status), join, get participants, update status.
- **Future commands:** e.g. `/event create`, `/event join`, `/event leaderboard`, `/event results`.
- **Web:** browse events, join, view results via API.

## Posts / social feed

- **Tables:** `posts`, `post_likes` (migration `012_posts.sql`).
- **Service:** `services/platform/postsService.ts`
  - Create, get, list (global or by author), like, unlike.
- **Future:** achievement posts, game highlights, optional Discord cross-post.

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

| Method | Path                          | Description                                                                                              |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| GET    | `/api/profile/:userId`        | Profile (xp, level, games, wins, achievements, daily streak). `userId` = platform user_id or Discord id. |
| GET    | `/api/leaderboard`            | Usage leaderboard. Query: `scope=users                                                                   | commands`, `limit`. |
| GET    | `/api/leaderboard?game=slots` | Per-game leaderboard (e.g. `game=slots`, `game=daily`).                                                  |
| GET    | `/api/events`                 | List events. Query: `status=active                                                                       | ended`, `limit`.    |
| GET    | `/api/events/:id`             | Single event + participants.                                                                             |
| POST   | `/api/events/:id/join`        | Body: `{ "userId": "..." }`. Join event.                                                                 |
| GET    | `/api/games/state/:gameId`    | Game state (board, turn, status, expiresAt).                                                             |
| POST   | `/api/games/move`             | Body: `{ "gameId", "userId", "col" }`. Apply move (e.g. Connect 4).                                      |

Responses are JSON. No auth is implemented yet; add API keys or Discord OAuth when building the frontend.

## Leaderboards

- **Usage:** `leaderboardService.getUsageLeaderboard({ scope: "users"|"commands", limit })` — from fun usage store.
- **Per-game:** `leaderboardService.getGameLeaderboard(gameType, { limit })` — e.g. slots, daily; extend for more games.
- **Scopes:** Global (current); server/weekly can be added by filtering in the store or API.

## Achievements

- **Definitions:** `commands/games/achievements/definitions.ts` (id, title, description, xpReward, icon, checkFn).
- **Unlock state:** Stored implicitly via game stats and progression; profile and achievements embed use the same checks.
- **Web:** Profile API includes `achievementsEarned` / `achievementsTotal`; a future endpoint can return full achievement list and unlock state.

## Profiles

- **Service:** `services/platform/profileService.ts` — `getProfile(userIdOrDiscordId)`.
- Returns: username, avatarUrl, xp, level, gamesPlayed, wins, winRate, achievements, daily streak.
- **Discord:** `/profile view` uses the same data (via profileHelpers + progression + gameStats).
- **Web:** `GET /api/profile/:userId` returns the same shape.

## Real-time (future)

- Services are stateless and keyed by id; a WebSocket or SSE layer can subscribe to “game updates” or “event updates” and push from the same service layer.
- No implementation yet; design is compatible with adding it later.

## Future TODOs

- [ ] **Discord OAuth** for web login and account linking.
- [ ] **Auth middleware** for web API (API key or session).
- [ ] **POST /api/posts** and **GET /api/posts** (and optional comments).
- [ ] **Event create/update** via API and/or `/event create` command.
- [ ] **Weekly leaderboard** window (filter by date range).
- [ ] **Server (guild) leaderboard** when guild_id is stored with usage or games.
- [ ] **WebSocket or SSE** for live game/event updates.
- [ ] **Achievement badges** API and web profile display.
