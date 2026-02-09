-- Migration: 002_game_usage_daily
-- Adds table for daily game play metrics (analytics)

CREATE TABLE IF NOT EXISTS game_usage_daily (
  date TEXT NOT NULL,
  command TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, command, user_id)
);
CREATE INDEX IF NOT EXISTS idx_game_usage_daily_date ON game_usage_daily(date);
