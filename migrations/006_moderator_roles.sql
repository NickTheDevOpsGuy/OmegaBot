-- Moderator roles per guild (users with these roles can use /admin moderation).
CREATE TABLE IF NOT EXISTS moderator_roles (
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, role_id)
);
