# Analytics & Game Metrics

OmegaBot records gameplay data for analytics and leaderboards.

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
- `connect4`, `tictactoe`, `dice`, `coinflip`

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
