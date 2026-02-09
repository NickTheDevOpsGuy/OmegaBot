-- OmegaBot base schema - all tables created with IF NOT EXISTS for idempotency

CREATE TABLE IF NOT EXISTS faqs (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS user_timezones (
  user_id TEXT PRIMARY KEY,
  timezone TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS guild_config (
  guild_id TEXT PRIMARY KEY,
  config TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fun_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  command TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fun_usage_user ON fun_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_fun_usage_command ON fun_usage(command);

CREATE TABLE IF NOT EXISTS jokes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  joke_text TEXT NOT NULL,
  category TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_jokes_category ON jokes(category);

CREATE TABLE IF NOT EXISTS coin_flips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('heads','tails')),
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coin_flips_user ON coin_flips(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_flips_user_ts ON coin_flips(user_id, timestamp);

CREATE TABLE IF NOT EXISTS github_last_seen (
  repo_key TEXT PRIMARY KEY,
  last_seen_timestamp INTEGER NOT NULL,
  entity_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  delivered_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending_due ON reminders(delivered_at, due_at);

CREATE TABLE IF NOT EXISTS github_assignees_meta (
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  initialized_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner, repo)
);

CREATE TABLE IF NOT EXISTS github_assignees_state (
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  number INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  assignees_json TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (owner, repo, number)
);

CREATE INDEX IF NOT EXISTS idx_github_assignees_repo ON github_assignees_state(owner, repo);

CREATE TABLE IF NOT EXISTS rps_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rps_h2h (
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  user1_wins INTEGER NOT NULL DEFAULT 0,
  user2_wins INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS rps_pvp_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trivia_stats (
  user_id TEXT PRIMARY KEY,
  correct INTEGER NOT NULL DEFAULT 0,
  incorrect INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  context TEXT
);

CREATE INDEX IF NOT EXISTS idx_quotes_guild ON quotes(guild_id);
CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(guild_id, author_id);

CREATE TABLE IF NOT EXISTS daily_checkins (
  user_id TEXT PRIMARY KEY,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  last_checkin INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS afk_status (
  user_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  message TEXT NOT NULL,
  set_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_afk_guild ON afk_status(guild_id);

CREATE TABLE IF NOT EXISTS ttt_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ttt_h2h (
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  user1_wins INTEGER NOT NULL DEFAULT 0,
  user2_wins INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS blackjack_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  blackjacks INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS connect4_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS connect4_h2h (
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  user1_wins INTEGER NOT NULL DEFAULT 0,
  user2_wins INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS hangman_stats (
  user_id TEXT PRIMARY KEY,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_guesses INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wordle_games (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  word TEXT NOT NULL,
  guesses TEXT NOT NULL,
  won INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS wordle_stats (
  user_id TEXT PRIMARY KEY,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  guess_distribution TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS slots_stats (
  user_id TEXT PRIMARY KEY,
  spins INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  jackpots INTEGER NOT NULL DEFAULT 0,
  biggest_win TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  host_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 1,
  ends_at INTEGER NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  winners TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  entered_at INTEGER NOT NULL,
  PRIMARY KEY (giveaway_id, user_id),
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
);

CREATE INDEX IF NOT EXISTS idx_giveaways_ends ON giveaways(ends_at) WHERE ended = 0;

CREATE TABLE IF NOT EXISTS starboard_posts (
  original_message_id TEXT PRIMARY KEY,
  starboard_message_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  star_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_starboard_guild ON starboard_posts(guild_id);

CREATE TABLE IF NOT EXISTS game_usage_daily (
  date TEXT NOT NULL,
  command TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, command, user_id)
);
CREATE INDEX IF NOT EXISTS idx_game_usage_daily_date ON game_usage_daily(date);
