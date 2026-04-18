import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { env } from "../../../config/env.js";

/**
 * Broad bot-admin access used for knowledge-base style management flows.
 *
 * Sources of access:
 * - ADMIN_USER_IDS
 * - Discord Administrator / Manage Server
 * - BOT_ADMIN_ROLE_IDS
 */
export function canUseBotAdmin(interaction: ChatInputCommandInteraction): boolean {
  const userId = interaction.user?.id ?? null;
  if (userId && env.adminUserIds.has(userId)) return true;
  if (!interaction.inGuild()) return false;

  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;

  if (!interaction.member) return false;
  if (env.botAdminRoleIds.size === 0) return false;

  const member = interaction.member as GuildMember;
  return [...env.botAdminRoleIds].some((roleId) => member.roles.cache.has(roleId));
}

export function describeBotAdminAccess(): string {
  return [
    "Allowed via one of:",
    "- ADMIN_USER_IDS in `.env`",
    "- Discord Administrator or Manage Server",
    "- BOT_ADMIN_ROLE_IDS in `.env`",
  ].join("\n");
}
