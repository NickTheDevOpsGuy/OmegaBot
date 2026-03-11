// src/commands/config/moderatorRole.ts
// Moderator role DB and /config moderator-role handler.

import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../services/core/database/db.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { t, resolveLocale } from "../../../i18n/index.js";

function ensureModeratorRolesTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS moderator_roles (
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, role_id)
    )
  `);
}

export function addModeratorRole(guildId: string, roleId: string): void {
  ensureModeratorRolesTable();
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO moderator_roles (guild_id, role_id) VALUES (?, ?)",
    )
    .run(guildId, roleId);
}

export function removeModeratorRole(guildId: string, roleId: string): boolean {
  ensureModeratorRolesTable();
  const r = getDb()
    .prepare("DELETE FROM moderator_roles WHERE guild_id = ? AND role_id = ?")
    .run(guildId, roleId);
  return r.changes > 0;
}

export function listModeratorRoles(guildId: string): string[] {
  ensureModeratorRolesTable();
  const rows = getDb()
    .prepare("SELECT role_id FROM moderator_roles WHERE guild_id = ?")
    .all(guildId) as Array<{ role_id: string }>;
  return rows.map((r) => r.role_id);
}

export async function handleModeratorRole(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  if (!interaction.guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.reply({
      content: t("common.guild_only", locale),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const guildId = interaction.guildId;

  if (sub === "add") {
    const role = interaction.options.getRole("role", true);
    addModeratorRole(guildId, role.id);
    getContextLogger().info({ guildId, roleId: role.id }, "[config] moderator role added");
    await interaction.reply({
      content: `✅ **${role.name}** can now use \`/admin\` moderation (timeout, kick, ban).`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "remove") {
    const role = interaction.options.getRole("role", true);
    const removed = removeModeratorRole(guildId, role.id);
    getContextLogger().info({ guildId, roleId: role.id, removed }, "[config] moderator role removed");
    await interaction.reply({
      content: removed
        ? `✅ **${role.name}** removed from moderator roles.`
        : `**${role.name}** wasn't in the moderator list.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "list") {
    const roleIds = listModeratorRoles(guildId);
    if (roleIds.length === 0) {
      await interaction.reply({
        content:
          "No moderator roles configured. Add one with `/config moderator-role add role:@Role`. Users in `ADMIN_USER_IDS` (in .env) can still use /admin.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const list = roleIds.map((id) => `<@&${id}>`).join(", ");
    await interaction.reply({
      content: `**Moderator roles:** ${list}\n\nThese roles can use \`/admin\` (timeout, kick, ban).`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
