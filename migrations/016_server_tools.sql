CREATE TABLE IF NOT EXISTS automod_settings (
  guild_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  block_invites INTEGER NOT NULL DEFAULT 1,
  block_links INTEGER NOT NULL DEFAULT 0,
  block_caps INTEGER NOT NULL DEFAULT 0,
  block_spam INTEGER NOT NULL DEFAULT 1,
  caps_percent INTEGER NOT NULL DEFAULT 75,
  spam_message_count INTEGER NOT NULL DEFAULT 5,
  spam_window_seconds INTEGER NOT NULL DEFAULT 10,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS automod_banned_words (
  guild_id TEXT NOT NULL,
  word TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, word)
);

CREATE TABLE IF NOT EXISTS mod_warnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  cleared_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mod_warnings_user
  ON mod_warnings(guild_id, user_id, cleared_at, created_at DESC);

CREATE TABLE IF NOT EXISTS custom_commands (
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  response TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, name)
);

CREATE TABLE IF NOT EXISTS reaction_roles (
  guild_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  role_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, message_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reaction_roles_message
  ON reaction_roles(guild_id, message_id);
