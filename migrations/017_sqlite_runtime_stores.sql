CREATE TABLE IF NOT EXISTS user_timezones_scoped (
  scope TEXT NOT NULL CHECK (scope IN ('guild','global')),
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timezone TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, guild_id, user_id)
);

INSERT OR IGNORE INTO user_timezones_scoped
  (scope, guild_id, user_id, timezone, label, created_at, updated_at)
SELECT
  'global',
  'global',
  user_id,
  timezone,
  NULL,
  datetime(updated_at / 1000, 'unixepoch'),
  datetime(updated_at / 1000, 'unixepoch')
FROM user_timezones;

CREATE TABLE IF NOT EXISTS fun_polls (
  message_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  guild_id TEXT,
  creator_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  counts_json TEXT NOT NULL,
  votes_json TEXT NOT NULL
);
