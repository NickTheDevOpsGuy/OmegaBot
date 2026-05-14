import { getDb } from "../../core/database/db.js";

export type SelfAssignableRole = {
  guildId: string;
  roleId: string;
  description: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export function ensureSelfAssignableRolesTable(): void {
  getDb().exec(`
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
  `);
}

function normalizeDescription(description?: string | null): string | null {
  const trimmed = description?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function upsertSelfAssignableRole(input: {
  guildId: string;
  roleId: string;
  description?: string | null;
  createdBy: string;
}): SelfAssignableRole {
  ensureSelfAssignableRolesTable();
  const now = Date.now();
  const description = normalizeDescription(input.description);

  getDb()
    .prepare(
      `INSERT INTO self_assignable_roles
        (guild_id, role_id, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, role_id) DO UPDATE SET
        description = excluded.description,
        updated_at = excluded.updated_at`,
    )
    .run(input.guildId, input.roleId, description, input.createdBy, now, now);

  return {
    guildId: input.guildId,
    roleId: input.roleId,
    description,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function removeSelfAssignableRole(guildId: string, roleId: string): boolean {
  ensureSelfAssignableRolesTable();
  const result = getDb()
    .prepare(
      `DELETE FROM self_assignable_roles
       WHERE guild_id = ? AND role_id = ?`,
    )
    .run(guildId, roleId);
  return result.changes > 0;
}

export function getSelfAssignableRole(
  guildId: string,
  roleId: string,
): SelfAssignableRole | null {
  ensureSelfAssignableRolesTable();
  const row = getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        role_id AS roleId,
        description,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM self_assignable_roles
       WHERE guild_id = ? AND role_id = ?`,
    )
    .get(guildId, roleId) as SelfAssignableRole | undefined;
  return row ?? null;
}

export function listSelfAssignableRoles(guildId: string): SelfAssignableRole[] {
  ensureSelfAssignableRolesTable();
  return getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        role_id AS roleId,
        description,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM self_assignable_roles
       WHERE guild_id = ?
       ORDER BY updated_at DESC, role_id ASC`,
    )
    .all(guildId) as SelfAssignableRole[];
}
