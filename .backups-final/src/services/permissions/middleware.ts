// src/services/permissions/middleware.ts
import type { ChatInputCommandInteraction, PermissionResolvable } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * Permission check result.
 */
export type PermissionCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Permission requirements for a command.
 */
export interface PermissionRequirements {
  /** Discord permissions required to run the command */
  permissions?: PermissionResolvable[];
  /** Whether the command requires administrator privileges */
  adminOnly?: boolean;
  /** Whether the command can only be used in guilds (not DMs) */
  guildOnly?: boolean;
  /** Specific role IDs that can use the command */
  allowedRoles?: string[];
  /** Specific user IDs that can use the command */
  allowedUsers?: string[];
}

/**
 * Check if a user has permission to execute a command.
 */
export function checkPermissions(
  interaction: ChatInputCommandInteraction,
  requirements: PermissionRequirements,
): PermissionCheckResult {
  // Guild-only check
  if (requirements.guildOnly && !interaction.guild) {
    return {
      allowed: false,
      reason: "This command can only be used in a server.",
    };
  }

  // If no guild, skip permission checks (DM context)
  if (!interaction.guild || !interaction.member) {
    return { allowed: true };
  }

  const member = interaction.member;

  // Admin-only check
  if (requirements.adminOnly) {
    if (
      !("permissions" in member) ||
      typeof member.permissions === "string" ||
      !member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      logger.warn(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          command: interaction.commandName,
        },
        "Permission denied: admin only",
      );
      return {
        allowed: false,
        reason: "This command requires administrator privileges.",
      };
    }
  }

  // Specific permission checks
  if (requirements.permissions && requirements.permissions.length > 0) {
    if (!("permissions" in member)) {
      return {
        allowed: false,
        reason: "Unable to verify permissions.",
      };
    }

    // Skip permission check if user is admin
    if (
      typeof member.permissions !== "string" &&
      member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return { allowed: true };
    }

    // Check specific permissions
    if (typeof member.permissions === "string") {
      return {
        allowed: false,
        reason: "Unable to verify permissions.",
      };
    }

    const missing: string[] = [];
    for (const perm of requirements.permissions) {
      if (!member.permissions.has(perm)) {
        missing.push(String(perm));
      }
    }

    if (missing.length > 0) {
      logger.warn(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          command: interaction.commandName,
          missingPermissions: missing,
        },
        "Permission denied: missing permissions",
      );
      return {
        allowed: false,
        reason: `You are missing the following permissions: ${missing.join(", ")}`,
      };
    }
  }

  // Role-based access
  if (requirements.allowedRoles && requirements.allowedRoles.length > 0) {
    const userRoles =
      typeof member.roles !== "string" && "cache" in member.roles
        ? Array.from(member.roles.cache.keys())
        : [];
    
    const hasRole = requirements.allowedRoles.some((roleId) =>
      userRoles.includes(roleId),
    );

    if (!hasRole) {
      logger.warn(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          command: interaction.commandName,
        },
        "Permission denied: missing required role",
      );
      return {
        allowed: false,
        reason: "You do not have the required role to use this command.",
      };
    }
  }

  // User whitelist
  if (requirements.allowedUsers && requirements.allowedUsers.length > 0) {
    if (!requirements.allowedUsers.includes(interaction.user.id)) {
      logger.warn(
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          command: interaction.commandName,
        },
        "Permission denied: user not in whitelist",
      );
      return {
        allowed: false,
        reason: "You are not authorized to use this command.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Common permission presets.
 */
export const PermissionPresets = {
  /** Admin-only commands (config, dangerous operations) */
  ADMIN_ONLY: {
    adminOnly: true,
    guildOnly: true,
  } satisfies PermissionRequirements,

  /** Moderator commands */
  MODERATOR: {
    permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers],
    guildOnly: true,
  } satisfies PermissionRequirements,

  /** Must be in a guild */
  GUILD_ONLY: {
    guildOnly: true,
  } satisfies PermissionRequirements,

  /** Anyone can use */
  PUBLIC: {} satisfies PermissionRequirements,
} as const;