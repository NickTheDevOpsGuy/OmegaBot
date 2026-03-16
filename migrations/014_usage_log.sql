-- Time- and guild-scoped usage for weekly/server leaderboards
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT,
  command TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_created ON usage_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_guild_created ON usage_log(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at);
