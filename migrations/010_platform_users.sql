-- Platform users: map Discord (and future web OAuth) to a single profile.
-- discord_id is the primary key for now; internal user_id allows future multi-provider accounts.

CREATE TABLE IF NOT EXISTS platform_users (
  user_id TEXT PRIMARY KEY,
  discord_id TEXT UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_users_discord ON platform_users(discord_id);
