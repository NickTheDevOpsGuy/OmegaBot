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
