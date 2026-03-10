## [3.9.9] - 2026-03-10

### Changed

- **Hangman words** – Seed words live only in SQLite: migration `005_hangman_seed_words.sql` (1,600+ easy/medium/hard words). No TypeScript seed list; store reads from DB only.
- **Dev-notes** – File and folder limits (≤300 lines per file, ≤10 items per folder; `fun/subcommands` documented as exception). Comments section: file-purpose at top, JSDoc for exported/non-obvious behavior.
- **File-purpose comments** – Added or clarified in key modules (db, forecast, quote, leaderboard, poll, wouldYouRather, scheduler, rps/challenge, blackjack, interactionHandler, tracedInteractionHandler, funUsageStore, issueAssigneePoller, hangmanWordStore).
- **JSDoc** – Expanded on critical-path exports: `getRandomWord`, `handleInteraction`, `getRow`/`getAll` (db).
- **Docs** – README and dev-notes updated for file/folder shifts: help `topics/meta/` (overview, changelog, summary), discord `interaction/` (interactionHandler, interactionErrors, tracedInteractionHandler); file tree and project layout reflect current structure.

---

## [3.9.8] - 2026-02-26

### Added

- **i18n for rate limits** – Cooldown messages use `t()` with guild locale (en/es/de)
- **Integration tests** – ping, slots, admin health (following dice pattern)
- **Correlation IDs** – Request context (requestId) in interaction logs for tracing failures
- **Health check optional services** – Weather and GitHub API reachability in `/admin health`
- **Command usage analytics** – `command_usage_daily` table for non-game commands
- **Summary fallback** – When LLM API fails, falls back to local summary
- **Post-register sanity check** – Verifies command count after registration
- **Backup reminder** – Startup log when BACKUP_KEEP not set
- **Discord.js version check** – `npm run check:discord` in CI
- **Remind snooze** – `/fun remind snooze` to reschedule a reminder by ID and time (e.g. 30m, 1h); ID has autocomplete
- **Info server invite** – `/info server` optional **invite** creates a 24h invite link for the channel (when bot has Create Invite)

### Changed

- **Refactors** – Daily logic in `daily/dailyStore.ts`; stats in `stats/fetchers.ts` + `stats/buildEmbed.ts`; achievements in `definitions.ts` + `embedBuilder.ts`; starboard in `starboardStore.ts` + `starboardEmbed.ts`; Connect 4 PvP in `connect4/pvp.ts`
- **Error messages** – Generic errors use i18n `t("error.generic")`
- **E2E** – `npm run test:e2e`; GitHub Action job when secrets present
- **CI** – Test coverage run + artifact upload; coverage threshold (lines/functions/statements 50%, branches 40%) in `vitest.config.ts`; Codecov upload for coverage badge
- **Stricter typings** – `getRow<T>` / `getAll<T>` in `services/database/db.ts` for typed SQLite results; reminders, giveaway store, joke store, stats fetchers, and db recovery/PRAGMA use them or named types; `migrations.ts` uses named `MigrationRow`
- **Docs** – Permissions reminder in `improvements.md` (keep new admin features behind roles/permissions); README coverage badge (Codecov)

### Fixed / Refactored

- **Reminders** – Single source of truth: `services/reminders/store.ts` has all DB ops (`cancelReminder`, `cancelAllByUser`, `updateDueAt`, `getReminderForUser`); fun command uses the store only (no duplicate DB logic).
- **Info command** – Handlers split into `info/handlers/userInfo.ts`, `serverInfo.ts`, `avatar.ts`; main `info.ts` stays thin.
- **Help** – New topic **info** (`/help topic:info`) for user/server/avatar; overview topic list updated.
- **Error handling** – Button and modal handlers now send a user-facing message on failure ("Something went wrong…"); invite creation failure in `/info server` logged at debug; dev-notes document error-handling and logging patterns.

---

## [3.9.7] - 2026-02-12

### Added

- **Quote list limit option** – Choose 5, 10, or 25 (default: 25)
- **Quote search limit option** – Choose 5, 10, or 25 results

### Changed

- **Refactors** – helpText split into `help/topics/*`; giveaway button handler extracted; hangman stats in `hangman/hangmanStats.ts`; fun subcommands in gamesGroup/utilityGroup; interaction handlers in `handlers/*`
- **Quote context menu** – Allows quoting bot messages (no longer blocked)
- **Quote autocomplete in DMs** – Shows "Use in a server" instead of empty
- **Avatar help** – Note that GIF shows static when avatar isn't animated

---

## [3.9.6] - 2026-02-12

### Added

- **Help topic: quotes** – `/help topic:quotes` for quote commands and context menu
- **Quote remove autocomplete** – Suggests recent quotes when removing

### Changed

- **Quote context menu** – Supports embed-only messages (extracts title + description)
- **Avatar format** – Added GIF option for animated avatars
- **Suggestion modal** – Specific error when bot lacks Send Messages or Embed Links
- **Playback docs** – Documented `before`/`after` message IDs for paging

---

## [3.9.5] - 2026-02-12

### Added

- **Message context menu: Quote** – Right-click a message → "Quote"; saves it as a server quote
- **Quote store** – Shared `services/quotes/quoteStore.ts` for `/fun quote add` and context menu
- **Info avatar options** – Size (128–4096) and format (PNG/JPEG/WebP) choices
- **Playback private option** – `private` flag (default: true) to show playback only to you
- **Suggestion modal** – `/suggestion` opens a modal for multi-line input (up to 1000 chars)

### Changed

- **Help overview** – Clarified private-default: profile, info, achievements; use `private:false` to show in channel
- **FAQ ephemeral default** – FAQ get/list now default to private
- **Commands docs** – Context menus (Summarize, Quote), avatar options, playback private, suggestion modal

---

## [3.9.4] - 2026-02-12

### Added

- **Message context menu: Summarize** – Right-click a message → "Summarize"; DMs a summary of messages up to that point
- **Rate limit metrics** – Prometheus `omegabot_rate_limit_hits_total` for cooldown hits (dice, slots, blackjack, hangman, darts)

### Changed

- **Ephemeral by default** – `/profile view` and `/info user` now default to private (ephemeral); use `private: false` to show in channel
- **Grafana dashboard** – Added "Rate limit hits (cooldown)" panel

---

## [3.9.3] - 2026-02-12

### Added

- **Admin timeout presets** – Duration dropdown (5m, 10m, 30m, 1h, 6h, 12h, 1d, 7d)
- **FAQ list tag autocomplete** – Suggests existing tags when filtering
- **Help topic: summary** – `/help topic:summary` for /summary and /history
- **Context menus** – Right-click user → "View Profile" and "View Achievements"

---

## [3.9.2] - 2026-02-12

### Changed

- **Help topics** – Clearer choice names (e.g. "Profile & timezone", "Games"); added `games` and `profile`; removed obsolete `timezone`/`summary` choices
- **Giveaway** – Autocomplete for `end` and `reroll` ID option (shows active/ended giveaways with prize preview)
- **Remind cancel** – Autocomplete for reminder ID (shows user's pending reminders with message preview)

---

## [3.9.1] - 2026-02-12

### Added

- **Dashboard auth** – `ADMIN_DASHBOARD_TOKEN` requires `?token=<value>` for `/dashboard` when set (use when exposing publicly)
- **Docker docs** – Runbook section for `docker compose up`, volume, logs
- **Grafana docs** – [docs/grafana.md](docs/grafana.md) with import steps and panel descriptions
- **Backup note** – Runbook documents integrity check when `sqlite3` is installed

---

## [3.9.0] - 2026-02-12

### Added

- **Docker & Docker Compose** – One-command run: `docker compose up -d`; persisted data volume
- **Web admin dashboard** – When `METRICS_PORT` is set, `GET /` or `GET /dashboard` shows health, DB status, Discord connection, uptime
- **Grafana dashboard** – `grafana/omegabot-dashboard.json` for Prometheus metrics (uptime, command rate, interaction recovery)
- **DevContainer** – `.devcontainer/devcontainer.json` for VS Code Dev Containers
- **Circuit breakers** – GitHub, Weather, OpenAI APIs fail fast after 5 consecutive errors; 30s reset before retry
- **Health check includes Discord** – `/health` returns 503 when Discord gateway is disconnected
- **Backup verification** – `db:backup` runs `PRAGMA integrity_check` when sqlite3 is available; fails if backup is corrupt
- **Dev seed script** – `npm run db:seed` populates DB with sample FAQs and timezone for local dev
- **Hot reload** – `npm run dev:watch` restarts bot on file change (Node `--watch`)
- **Dependabot** – `.github/dependabot.yml` for weekly npm dependency updates
- **Cooldown helper** – `formatCooldownMessage()` for consistent "Try again in Xs" across rate-limited commands
- **i18n skeleton** – `src/i18n/index.ts` with `t()` and `resolveLocale()` for future localization

---

## [3.8.0] - 2026-02-12

### Added

- **Autocomplete** – Profile timezone (`/profile timezone zone`) and FAQ keys (`/faq get`, `/faq remove`) with type-ahead suggestions
- **Metrics & health HTTP server** – Optional `METRICS_PORT` (e.g. 9090) enables:
  - `/health` – JSON status (200/503), database check, uptime
  - `/metrics` – Prometheus scrape endpoint (commands executed, interaction recovery, uptime)
- **Automated backup script** – `npm run db:backup` or `scripts/backup-db.sh`; keeps last N backups (configurable via `BACKUP_KEEP`)
- **Graceful shutdown** – SIGINT/SIGTERM destroy Discord client before closing DB
- **Migration system** – Versioned migrations in `migrations/` (runs before schema load)
- **Discord 429 retry** – `safeReply` / `safeMessageEdit` now retry on rate limit (429) responses
- **Clearer error messages** – Missing env vars (e.g. `GITHUB_TOKEN`, `WEATHERAPI_KEY`, `OPENAI_API_KEY`) suggest: "Set it in .env (see .env.example)"

### Changed

- **Database init** – Runs migrations from `migrations/` directory on startup

---

## [3.7.0] - 2026-02-12

### Added

- **Autocomplete handling** – Interaction handler supports optional `autocomplete` on command modules; responds with `[]` when no handler
- **Monitoring tag** – Catch blocks that recover from collector/button errors log `interactionFailedRecovery: true` for log aggregation and alerting

### Changed

- **Interaction failed prevention** – All game collectors (wordle, blackjack, hangman, rps, darts, connect4, tictactoe, poll, wouldYouRather, playback) and giveaway buttons now defer immediately before heavy work, use `message.edit()` after defer, and wrap in try/catch with fallback `deferUpdate()` on error
- **Dev notes** – Added "Autocomplete & Interaction Handling" section with patterns and monitoring guidance

---

## [3.5.0] - 2026-02-12

### Added

- **`/status` command** – Check Vercel and Supabase platform status

### Changed

- **Profile refactor** – `/profile` now uses subcommands (view, afk, timezone) in separate files, matching the `/faq` pattern
- **Fun subcommands** – Extracted quote, hangman, and remind groups from `funSubcommands.ts` into `funSubcommands/*.ts`
- **Shared constants** – New `src/constants.ts` for game timeouts (GAME_TIMEOUT_MS, MOVE_TIMEOUT_MS, etc.) and rate limit cooldowns

### Fixed

- **general/ping loading** – Added `general/general.ts` so the loader finds the ping command
- **github/gh loading** – Added `github/github.ts` so the loader finds the gh command

---

## [3.6.0] - 2026-02-12

### Changed

- **README** – Updated project structure (profile subcommands, funSubcommands, status, constants, ping folder, docs)
- **TypeScript** – Enabled strict mode: `strict`, `strictNullChecks`, `noImplicitAny`, `useUnknownInCatchVariables`
- **Ping command** – Moved from `general/ping.ts` to `ping/ping.ts` for consistency

### Fixed

- **config** – `starboardThreshold` uses default (3) when clearing instead of null
- **info** – Permission checks now use `PermissionFlagsBits` constants
- **suggestion** – Channel send uses type guard for `TextBasedChannel`
- **Catch callbacks** – Added explicit `(): null => null` return types for `noImplicitAny`
  - `/status vercel` – Vercel status (builds, deploy, edge network)
  - `/status supabase` – Supabase status (API, database, auth, storage)
  - Uses public Statuspage v2 API; shows degraded components and active incidents
  - Ephemeral replies; no API keys required

---

## [3.4.0] - 2026-02-10

### Added

- **Runbook** – [docs/runbook.md](docs/runbook.md): deploy, restart, DB backup, health, security (no secrets in logs)
- **FAQ for server admins** – [docs/faq-admins.md](docs/faq-admins.md): Hangman words, interaction failed, backup, optional features, rate limits
- **Startup optional-features log** – Bot logs `[startup] optional features` (weather, summary, hangmanAdmin, jokeModerator, autoRole) so misconfig is obvious
- **Improvement ideas doc** – [docs/improvements.md](docs/improvements.md) with optional next steps (no new commands)

### Changed

- **Pre-push** – `scripts/precheck.sh` now runs `npm run test:run` (use `[skip-precheck]` to skip)
- **CI** – Uses `npm run test:run`; added `npm audit --audit-level=high` (continue-on-error)
- **Rate limit replies** – Hangman, blackjack, slots, dice cooldown messages now include “(rate limit: Xs)”
- **README** – Backup reminder in Operational Notes; doc links to runbook, faq-admins, improvements
- **Dev-notes** – Never log secrets; runbook Security section

### Fixed

- **FAQ services tests** – Added title/body empty validation tests; removed TODO

---

## [3.3.0] - 2026-02-10

### Added

- **Hangman overhaul**:
  - Letter selection via **dropdowns** (A–M and N–Z) so all letters including Z are available (fixes Discord cutting off buttons)
  - Words stored in **SQLite** (`hangman_words` table) with difficulty (easy/medium/hard); seed words included
  - **Difficulty** option when starting a game (`/fun hangman play`)
  - **Solve-time tracking**: fastest win and average win time in stats; new **Speed Demon** achievement (solve in ≤60s)
  - **Admin word management**: `/fun hangman words add` and `/fun hangman words list` for users with role in `HANGMAN_ADMIN_ROLE_ID`
- **Changelog in Discord**: `/help topic:changelog` shows recent release notes

### Changed

- **Hangman** is now a subcommand group: `play`, `stats`, `words add`, `words list`
- **hangman_stats** schema: added `best_time_seconds`, `total_win_time_seconds` (migration in db init)

---

## [3.2.0] - 2026-02-09

### Added

- **Longer game timeouts**: Blackjack, Hangman, Wordle, and RPS challenges now have 1-hour timeouts; Connect 4 and Tic Tac Toe use 10 minutes per move (was 1–2 minutes)
- **Extend time**: The person who started the game can add more time via an "Extend time" button (Blackjack, Connect 4, Tic Tac Toe, Wordle, RPS challenge)
- **Docs**: README and [commands.md](docs/commands.md) updated with game timeouts and extend-time behavior

### Changed

- **Timeout reminders**: Connect 4 and Tic Tac Toe now warn 1 minute before move timeout (was 15 seconds)

---

## [3.1.0] - 2026-02-09

### Added

- **Rate limiting**: Slots (3s), blackjack (5s), dice (2s), hangman (10s) cooldowns to prevent spam
- **Tests**: rateLimit.test.ts, gameUsageMetrics.test.ts
- **Daily game metrics**: `game_usage_daily` table for per-command, per-user play counts
- **Timeout reminders**: Connect 4 and Tic Tac Toe warn 15 seconds before move timeout
- **Retry logic**: `safeEditReply` and `safeMessageEdit` retry on transient API errors (rate limit, 5xx)
- **Integration tests**: Full dice command flow with mocked interaction
- **Top-level error handling**: Blackjack, hangman, trivia, slots wrap handlers in try/catch with user-friendly fallback
- **Expanded logging**: All game commands log start, outcome, and errors

### Changed

- **README**: Updated features, structure, and test count
- **Resilient interaction handling**: Retry on transient failures in addition to known error logging

### Fixed

- **Achievement tests**: Schema alignment with real tables (updated_at, timestamp, quote_text, etc.)
- **funUsageStore tests**: Isolated temp paths via `FUN_USAGE_STORE_PATH`
- **giveawayStore**: `getGiveaway` returns `null` instead of `undefined` for non-existent ID

---

## [3.0.0] - 2026-01-27

### Added

- **New Games**: Hangman, Wordle (daily puzzle), Slots (with jackpots)
- **Achievement System**: 19 achievements across 4 categories (Games, Luck, Dedication, Social)
- **Giveaway System**: Create giveaways with automatic winner selection, enter/leave buttons
- **Starboard**: Highlight popular messages with ⭐ reactions
- **Suggestion System**: Server suggestion box with voting
- **Combined Stats**: `/fun stats` shows all game stats in one place
- **Blackjack**: Hit/Stand game vs dealer
- **Connect 4**: PvP Connect 4 game
- **Would You Rather**: Vote on WYR questions
- **Random Facts**: `/fun fact` command
- **14 test files** covering games, stores, and core functionality

### Changed

- **Command Consolidation**: Reduced from 24 to 15 slash commands
  - `/userinfo`, `/serverinfo`, `/avatar` → `/info`
  - `/afk`, `/timezone` → `/profile`
  - `/starboard` → `/config starboard`
- **Code Organization**: Extracted database logic into separate store files
- **Reminders Enhanced**: Now supports set/list/cancel/clear subcommands
- **Profile Command**: Now shows stats, achievements, daily streak, AFK status

### Removed

- `/pagination` (internal utility)
- `/changelog` (rarely used)
- Standalone `/userinfo`, `/serverinfo`, `/avatar`, `/afk`, `/timezone`, `/starboard` commands

---

## [2.0.1] - 2026-01-20

### Added

- SQLite-backed reminders via `/fun remind` with reliable delivery after bot restart
- Joke command system with generational categories (boomer, genx, millennial, genz, genalpha)
- Coin flip result tracking and statistics
- Coin flip leaderboard showing top flippers
- Playback and pagination commands
- Timezone commands (save, show, clear, compare)
- Centralized structured logging
- Initial changelog tracking
- Added recording of head or tails per user for fun
