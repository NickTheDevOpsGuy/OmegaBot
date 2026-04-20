# Analytics & Game Metrics

OmegaBot records gameplay data for analytics and leaderboards.

---

## Table of Contents

- [Daily Game Metrics](#daily-game-metrics)
- [Command Usage (Non-Game)](#command-usage-non-game)

---

## Daily Game Metrics

The `game_usage_daily` table tracks how often each command is used per user per day.

### Schema

```sql
CREATE TABLE game_usage_daily (
  date TEXT NOT NULL,        -- YYYY-MM-DD (UTC)
  command TEXT NOT NULL,     -- e.g. "slots", "blackjack", "dice"
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, command, user_id)
);
```

### Commands Tracked

- `slots`, `blackjack`, `rps`, `trivia`, `hangman`, `wordle`
- `connect4`, `tictactoe`, `dice`, `coinflip`, `darts`

This same daily usage data also powers rotating quest progress where relevant.

### Usage

Data is recorded automatically when users run these commands. No configuration required.

**Query examples** (via SQL or a custom admin tool):

- Today's total plays for a command: `SELECT SUM(count) FROM game_usage_daily WHERE date = ? AND command = ?`
- Today's plays for a user: `SELECT SUM(count) FROM game_usage_daily WHERE date = ? AND user_id = ?`
- Most active command today: `SELECT command, SUM(count) as total FROM game_usage_daily WHERE date = ? GROUP BY command ORDER BY total DESC`

### Notes

- Dates are UTC. Use `date(new Date().toISOString().slice(0,10))` or equivalent for "today".
- Data is cumulative; `ON CONFLICT ... DO UPDATE` increments `count` for repeat plays.
- Table is created automatically on first use (or via `migrations/schema.sql` on init).

---

## Command Usage (Non-Game)

The `command_usage_daily` table tracks non-game command usage (help, profile, ping, etc.) per user per day. Game commands use `game_usage_daily` instead.

### Schema

```sql
CREATE TABLE command_usage_daily (
  date TEXT NOT NULL,
  command TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, command, user_id)
);
```

### Commands Tracked

All slash commands except the game commands listed above (slots, blackjack, dice, etc.).

### Location

`src/services/analytics/commandUsageStore.ts` – `recordCommandUsage()` is called from the interaction handler on successful command execution.
