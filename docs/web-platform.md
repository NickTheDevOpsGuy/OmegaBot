# Web platform support (Phase 15)

OmegaBot is structured so the same backend can power **Discord** and a **future web UI**. Game logic, progression, events, and profiles live in shared services; Discord commands and the web API both call these services.

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

Optional HTTP server: **`src/web/server.ts`**. Start with:

```bash
npm run build
node dist/web/server.js
```

Set `WEB_API_PORT` (default `4000`) and `DATABASE_PATH` as needed. The server calls `initDatabase()` and the same services as the bot.

### Endpoints (scaffold)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile/:userId` | Profile (xp, level, games, wins, achievements, daily streak). `userId` = platform user_id or Discord id. |
| GET | `/api/leaderboard` | Usage leaderboard. Query: `scope=users|commands`, `limit`. |
| GET | `/api/leaderboard?game=slots` | Per-game leaderboard (e.g. `game=slots`, `game=daily`). |
| GET | `/api/events` | List events. Query: `status=active|ended`, `limit`. |
| GET | `/api/events/:id` | Single event + participants. |
| POST | `/api/events/:id/join` | Body: `{ "userId": "..." }`. Join event. |
| GET | `/api/games/state/:gameId` | Game state (board, turn, status, expiresAt). |
| POST | `/api/games/move` | Body: `{ "gameId", "userId", "col" }`. Apply move (e.g. Connect 4). |

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
