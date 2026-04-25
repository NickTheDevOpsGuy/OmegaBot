// src/commands/admin/admin.ts
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getDb } from "../../../services/core/database/db.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { addUserOption } from "../../../services/discord/discord/slashOptions.js";
import { t, resolveLocale } from "../../../i18n/index.js";

import { safeReply } from "./utils.js";
import { handleTimeout } from "./subcommands/timeout.js";
import { handleKick } from "./subcommands/kick.js";
import { handleBan } from "./subcommands/ban.js";
import { handleStats } from "./subcommands/stats.js";
import { handleHealth } from "./subcommands/health.js";

/* -------------------------------------------------------------------------- */
/* Command definition                                                         */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin and moderation commands")
  // Permission gated in execute via ADMIN_USER_IDS (.env) and/or moderator roles
  .setDefaultMemberPermissions(null)
  .addSubcommand((sub) =>
    sub
      .setName("timeout")
      .setDescription("Timeout a user")
      .addUserOption((opt) =>
        addUserOption(opt, { description: "User to timeout", required: true }),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("duration")
          .setDescription("Duration in minutes")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(40320)
          .addChoices(
            { name: "5 minutes", value: 5 },
            { name: "10 minutes", value: 10 },
            { name: "30 minutes", value: 30 },
            { name: "1 hour", value: 60 },
            { name: "6 hours", value: 360 },
            { name: "12 hours", value: 720 },
            { name: "1 day", value: 1440 },
            { name: "7 days", value: 10080 },
          ),
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for timeout").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("kick")
      .setDescription("Kick a user from the server")
      .addUserOption((opt) =>
        addUserOption(opt, { description: "User to kick", required: true }),
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for kick").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("ban")
      .setDescription("Ban a user from the server")
      .addUserOption((opt) =>
        addUserOption(opt, { description: "User to ban", required: true }),
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for ban").setRequired(false),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("delete_days")
          .setDescription("Days of messages to delete (0-7)")
          .setRequired(false)
          .setMinValue(0)
          .setMaxValue(7),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Show bot statistics (uptime, database, commands)"),
  )
  .addSubcommand((sub) =>
    sub.setName("health").setDescription("Check bot and service health"),
  )
  .setDMPermission(true);

/* -------------------------------------------------------------------------- */
/* Permission check (exported for help / other callers)                        */
/* -------------------------------------------------------------------------- */

export function isModerator(interaction: ChatInputCommandInteraction): boolean {
  if (env.adminUserIds.size > 0 && env.adminUserIds.has(interaction.user.id)) return true;
  if (!interaction.inGuild() || !interaction.member) return false;

  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers))
    return true;

  try {
    const db = getDb();
    const guildId = interaction.guildId!;

    const roles = db
      .prepare(`SELECT role_id FROM moderator_roles WHERE guild_id = ?`)
      .all(guildId) as Array<{ role_id: string }>;

    if (!roles.length) return false;

    const member = interaction.member as GuildMember;
    const memberRoles = member.roles.cache;

    return roles.some((r) => memberRoles.has(r.role_id));
  } catch (err) {
    getContextLogger().error({ err }, "[admin] moderator role check threw");
    return false;
  }
}

/**
 * True if the user can run moderation subcommands (timeout, kick, ban).
 * When MODERATION_ALLOWED_ROLE_IDS is set, only those roles (or ADMIN_USER_IDS) may moderate.
 * Otherwise falls back to isModerator (Discord perms + moderator_roles).
 */
export function canUseModeration(interaction: ChatInputCommandInteraction): boolean {
  if (env.adminUserIds.has(interaction.user.id)) return true;
  if (!interaction.inGuild() || !interaction.member) return false;

  if (env.moderationAllowedRoleIds.size > 0) {
    const member = interaction.member as GuildMember;
    return [...env.moderationAllowedRoleIds].some((roleId) =>
      member.roles.cache.has(roleId),
    );
  }

  return isModerator(interaction);
}

/* -------------------------------------------------------------------------- */
/* Execute                                                                    */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand(true);

  try {
    const shouldBeEphemeral = subcommand !== "stats" && subcommand !== "health";
    await interaction.deferReply({ ephemeral: shouldBeEphemeral });

    if (subcommand === "stats") {
      await handleStats(interaction);
      return;
    }
    if (subcommand === "health") {
      await handleHealth(interaction);
      return;
    }

    if (!interaction.inGuild()) {
      const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
      await safeReply(interaction, {
        content: "❌ " + t("common.guild_only", locale),
        ephemeral: true,
      });
      return;
    }

    const hasPermission = await canUseModeration(interaction);
    if (!hasPermission) {
      const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
      await safeReply(interaction, {
        content: "❌ " + t("admin.no_permission", locale),
        ephemeral: true,
      });
      getContextLogger().info(
        { userId: interaction.user.id, guildId: interaction.guildId, subcommand },
        "[admin] moderation blocked, missing permission",
      );
      return;
    }

    switch (subcommand) {
      case "timeout":
        await handleTimeout(interaction);
        return;
      case "kick":
        await handleKick(interaction);
        return;
      case "ban":
        await handleBan(interaction);
        return;
      default: {
        const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
        await safeReply(interaction, {
          content: "❌ " + t("error.generic", locale),
          ephemeral: true,
        });
        return;
      }
    }
  } catch (err) {
    getContextLogger().error(
      { err, command: "admin", userId: interaction.user.id, subcommand },
      "[admin] admin command threw",
    );
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await safeReply(interaction, {
      content: "❌ " + t("error.generic", locale),
      ephemeral: true,
    });
  }
}
