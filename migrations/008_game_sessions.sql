-- Persistent multi-day / async game sessions (Connect 4, Chess, etc.)
-- Default expiration 72 hours; players can continue games later.

CREATE TABLE IF NOT EXISTS game_sessions (
  game_id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  guild_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  player1_id TEXT NOT NULL,
  player2_id TEXT,
  board_state TEXT NOT NULL,
  current_turn TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_expires ON game_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_players ON game_sessions(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_guild ON game_sessions(guild_id);
