import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../db/index.js";

/**
 * /admin
 *
 * Role-based moderation commands: timeout, kick, ban
 */
export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Moderation commands (role-based)")
  .addSubcommand((sub) =>
    sub
      .setName("timeout")
      .setDescription("Timeout a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to timeout").setRequired(true),
      )
      .addIntegerOption(
        (opt) =>
          opt
            .setName("duration")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(40320), // 28 days max
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Must be in a guild
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if user has the required role
    const hasPermission = await checkModeratorRole(interaction);
    if (!hasPermission) {
      await interaction.reply({
        content:
          "❌ You don't have permission to use moderation commands.\n" +
          "Ask an admin to set up moderator roles with `/config moderator-role`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "timeout":
        await handleTimeout(interaction);
        break;
      case "kick":
        await handleKick(interaction);
        break;
      case "ban":
        await handleBan(interaction);
        break;
      default:
        await interaction.reply({
          content: "Unknown subcommand.",
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (err) {
    logger.error(
      { err, command: "admin", userId: interaction.user.id },
      "[admin] command failed",
    );

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Something went wrong. Please try again later.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, "[admin] failed to send error reply");
    }
  }
}

/**
 * Check if user has moderator role
 */
async function checkModeratorRole(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.inGuild() || !interaction.member) {
    return false;
  }

  // Admins always have permission
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  try {
    const db = getDb();
    const guildId = interaction.guildId!;

    // Check for moderator roles in database
    const roles = db
      .prepare(`SELECT role_id FROM moderator_roles WHERE guild_id = ?`)
      .all(guildId) as Array<{ role_id: string }>;

    if (roles.length === 0) {
      // No moderator roles configured - only admins can use
      return false;
    }

    const member = interaction.member as GuildMember;
    const memberRoles = member.roles.cache;

    // Check if user has any of the moderator roles
    return roles.some((r) => memberRoles.has(r.role_id));
  } catch (err) {
    logger.error({ err }, "[admin] failed to check moderator role");
    return false;
  }
}

/**
 * Handle timeout subcommand
 */
async function handleTimeout(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const duration = interaction.options.getInteger("duration", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    // Can't timeout bots or self
    if (member.user.bot) {
      await interaction.reply({
        content: "❌ Cannot timeout bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot timeout yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check role hierarchy
    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: "❌ You cannot timeout someone with an equal or higher role.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Apply timeout
    const durationMs = duration * 60 * 1000;
    await member.timeout(durationMs, reason);

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been timed out for ${duration} minute(s).\n**Reason:** ${reason}`,
    });

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        duration,
        reason,
      },
      "[admin] User timed out",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] timeout failed");
    await interaction.reply({
      content: "❌ Failed to timeout user. Check my permissions and role position.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle kick subcommand
 */
async function handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    // Can't kick bots or self
    if (member.user.bot) {
      await interaction.reply({
        content: "❌ Cannot kick bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot kick yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check role hierarchy
    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: "❌ You cannot kick someone with an equal or higher role.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if member is kickable
    if (!member.kickable) {
      await interaction.reply({
        content: "❌ I don't have permission to kick this user.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Kick user
    await member.kick(reason);

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been kicked.\n**Reason:** ${reason}`,
    });

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        reason,
      },
      "[admin] User kicked",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] kick failed");
    await interaction.reply({
      content: "❌ Failed to kick user. Check my permissions and role position.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle ban subcommand
 */
async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Can't ban self
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot ban yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check role hierarchy if member is in server
    if (member) {
      if (member.user.bot) {
        await interaction.reply({
          content: "❌ Cannot ban bots.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const executor = interaction.member as GuildMember;
      if (member.roles.highest.position >= executor.roles.highest.position) {
        await interaction.reply({
          content: "❌ You cannot ban someone with an equal or higher role.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!member.bannable) {
        await interaction.reply({
          content: "❌ I don't have permission to ban this user.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Ban user
    await interaction.guild.members.ban(targetUser.id, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been banned.\n**Reason:** ${reason}${deleteDays > 0 ? `\n**Messages deleted:** Last ${deleteDays} day(s)` : ""}`,
    });

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        reason,
        deleteDays,
      },
      "[admin] User banned",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] ban failed");
    await interaction.reply({
      content: "❌ Failed to ban user. Check my permissions and role position.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
