CREATE TABLE IF NOT EXISTS guild_user_xp (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_user_xp_leaderboard
  ON guild_user_xp(guild_id, xp DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS level_role_rewards (
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, level)
);

CREATE INDEX IF NOT EXISTS idx_level_role_rewards_guild
  ON level_role_rewards(guild_id, level);
