-- command_usage_daily: non-game command usage analytics
CREATE TABLE IF NOT EXISTS command_usage_daily (
  date TEXT NOT NULL,
  command TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, command, user_id)
);
CREATE INDEX IF NOT EXISTS idx_command_usage_daily_date ON command_usage_daily(date);
