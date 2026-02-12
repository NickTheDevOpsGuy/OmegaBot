-- Migration: 003_darts_stats
-- Adds tables for darts solo and PvP stats

CREATE TABLE IF NOT EXISTS darts_stats (
  user_id TEXT PRIMARY KEY,
  throws INTEGER NOT NULL DEFAULT 0,
  best_round INTEGER NOT NULL DEFAULT 0,
  count_180 INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS darts_pvp_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS darts_h2h (
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  user1_wins INTEGER NOT NULL DEFAULT 0,
  user2_wins INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_darts_stats_best ON darts_stats(best_round DESC);
CREATE INDEX IF NOT EXISTS idx_darts_stats_180 ON darts_stats(count_180 DESC);
