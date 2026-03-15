-- Add status to game_sessions: active | finished | abandoned
-- Enables long-running games and cleanup of ended games.

ALTER TABLE game_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
