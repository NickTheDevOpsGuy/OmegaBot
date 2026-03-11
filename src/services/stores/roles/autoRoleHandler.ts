import type { GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";

export async function handleAutoRole(member: GuildMember): Promise<void> {
  if (!env.discordAutoRoleId) {
    logger.warn("discordAutoRoleId not set; auto-role disabled");
    return;
  }

  if (member.user.bot) {
    logger.debug("auto-role skipped: bot user");
    return;
  }

  const role = member.guild.roles.cache.get(env.discordAutoRoleId);

  if (!role) {
    logger.warn(
      { roleId: env.discordAutoRoleId, guildId: member.guild.id },
      "auto-role skipped: role not found in guild",
    );
    return;
  }

  const hasAutoRole = member.roles.cache.has(role.id);

  if (hasAutoRole) {
    logger.debug(
      { userId: member.user.id, roleId: role.id },
      "auto-role skipped: member already has role",
    );
    return;
  }

  const botMember = member.guild.members.me;

  if (!botMember) {
    logger.warn("[auto-role] could not resolve bot member in guild");
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.warn("[auto-role] missing Manage Roles permission");
    return;
  }

  if (role.position >= botMember.roles.highest.position) {
    logger.warn("[auto-role] role is higher than bot's highest role");
    return;
  }

  try {
    await member.roles.add(role);
    logger.info({ userId: member.user.id, roleId: role.id }, "auto-role assigned");
  } catch (err) {
    logger.error(
      { err, userId: member.user.id, roleId: role.id },
      "auto-role failed during assignment",
    );
  }
}
