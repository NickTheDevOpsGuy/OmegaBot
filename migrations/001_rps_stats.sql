-- Migration: 001_rps_stats
-- Adds table for rock paper scissors stats

CREATE TABLE IF NOT EXISTS rps_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rps_stats_wins ON rps_stats(wins DESC);
