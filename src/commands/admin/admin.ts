// src/commands/admin/admin.ts
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";

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
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("timeout")
      .setDescription("Timeout a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to timeout").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("duration")
          .setDescription("Duration in minutes")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(40320),
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
        opt.setName("user").setDescription("User to kick").setRequired(true),
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
        opt.setName("user").setDescription("User to ban").setRequired(true),
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
/* Permission check                                                           */
/* -------------------------------------------------------------------------- */

async function checkModeratorRole(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
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
    logger.error({ err }, "[admin] failed to check moderator role");
    return false;
  }
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
      await safeReply(interaction, {
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const hasPermission = await checkModeratorRole(interaction);
    if (!hasPermission) {
      await safeReply(interaction, {
        content:
          "❌ You don't have permission to use moderation commands.\n" +
          "Ask an admin to set up moderator roles with `/config moderator-role`.",
        ephemeral: true,
      });
      logger.info(
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
      default:
        await safeReply(interaction, {
          content: "Unknown subcommand.",
          ephemeral: true,
        });
        return;
    }
  } catch (err) {
    logger.error(
      { err, command: "admin", userId: interaction.user.id, subcommand },
      "[admin] command failed",
    );
    await safeReply(interaction, {
      content: "Something went wrong. Please try again later.",
      ephemeral: true,
    });
  }
}
