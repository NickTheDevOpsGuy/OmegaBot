import { getDb } from "../../core/database/db.js";

export type CustomCommand = {
  guildId: string;
  name: string;
  response: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  uses: number;
};

export function ensureCustomCommandTable(): void {
  getDb().exec(`
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
  `);
}

export function normalizeCustomCommandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^!+/, "")
    .replace(/[^a-z0-9_-]/g, "");
}

export function upsertCustomCommand(input: {
  guildId: string;
  name: string;
  response: string;
  createdBy: string;
}): CustomCommand {
  ensureCustomCommandTable();
  const name = normalizeCustomCommandName(input.name);
  if (!name) throw new Error("Command name must contain letters, numbers, _ or -");
  const response = input.response.trim();
  if (!response) throw new Error("Command response cannot be empty");

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO custom_commands
        (guild_id, name, response, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, name) DO UPDATE SET
        response = excluded.response,
        updated_at = excluded.updated_at`,
    )
    .run(input.guildId, name, response, input.createdBy, now, now);

  return getCustomCommand(input.guildId, name)!;
}

export function getCustomCommand(
  guildId: string,
  name: string,
): CustomCommand | null {
  ensureCustomCommandTable();
  const row = getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        name,
        response,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt,
        uses
       FROM custom_commands
       WHERE guild_id = ? AND name = ?`,
    )
    .get(guildId, normalizeCustomCommandName(name)) as CustomCommand | undefined;
  return row ?? null;
}

export function incrementCustomCommandUse(guildId: string, name: string): void {
  ensureCustomCommandTable();
  getDb()
    .prepare(
      `UPDATE custom_commands
       SET uses = uses + 1
       WHERE guild_id = ? AND name = ?`,
    )
    .run(guildId, normalizeCustomCommandName(name));
}

export function deleteCustomCommand(guildId: string, name: string): boolean {
  ensureCustomCommandTable();
  const result = getDb()
    .prepare(`DELETE FROM custom_commands WHERE guild_id = ? AND name = ?`)
    .run(guildId, normalizeCustomCommandName(name));
  return result.changes > 0;
}

export function listCustomCommands(guildId: string): CustomCommand[] {
  ensureCustomCommandTable();
  return getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        name,
        response,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt,
        uses
       FROM custom_commands
       WHERE guild_id = ?
       ORDER BY name ASC`,
    )
    .all(guildId) as CustomCommand[];
}
