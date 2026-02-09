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
