CREATE TABLE IF NOT EXISTS self_assignable_roles (
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_self_assignable_roles_guild
  ON self_assignable_roles(guild_id, updated_at DESC);
