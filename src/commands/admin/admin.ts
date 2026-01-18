// src/commands/admin/admin.ts

import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";
import { getFunUsageSnapshot } from "../../services/fun/funUsageStore.js";
import { EmbedColors } from "../../utils/colors.js";

/**
 * NOTE
 * This file intentionally centralizes reply behavior:
 * - We deferReply once per execution path
 * - We prefer editReply after deferring
 * - We fall back to reply if not deferred/replied
 */

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin and moderation commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  // Moderation subcommands
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
  // Bot stats subcommands
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Show bot statistics (uptime, database, commands)"),
  )
  .addSubcommand((sub) =>
    sub.setName("health").setDescription("Check bot and service health"),
  )
  .setDMPermission(true);

async function safeEphemeralMessage(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
      return;
    }
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  } catch (err) {
    logger.error({ err }, "[admin] failed to send safe reply");
  }
}

async function ensureDeferred(
  interaction: ChatInputCommandInteraction,
  ephemeral: boolean,
): Promise<void> {
  if (interaction.deferred || interaction.replied) return;

  // discord.js supports either { ephemeral: true } or flags
  // Using flags keeps compatibility with the rest of this repo style.
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
}

function isModeratorOrManager(interaction: ChatInputCommandInteraction): boolean {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

async function checkModeratorRole(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  // Hard guard
  if (!interaction.inGuild() || !interaction.guildId || !interaction.member) return false;

  // Manage Guild always allowed
  if (isModeratorOrManager(interaction)) return true;

  try {
    const db = getDb();
    const roles = db
      .prepare(`SELECT role_id FROM moderator_roles WHERE guild_id = ?`)
      .all(interaction.guildId) as Array<{ role_id: string }>;

    if (!roles.length) return false;

    const member = interaction.member as GuildMember;
    const memberRoles = member.roles.cache;
    return roles.some((r) => memberRoles.has(r.role_id));
  } catch (err) {
    logger.error(
      { err, guildId: interaction.guildId },
      "[admin] failed to check moderator role",
    );
    return false;
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  // Route 1: stats and health can run anywhere
  if (subcommand === "stats" || subcommand === "health") {
    await ensureDeferred(interaction, false);

    try {
      if (subcommand === "stats") {
        await handleStats(interaction);
      } else {
        await handleHealth(interaction);
      }
      return;
    } catch (err) {
      logger.error(
        { err, command: "admin", subcommand, userId: interaction.user.id },
        "[admin] stats/health failed",
      );
      await safeEphemeralMessage(
        interaction,
        "Something went wrong. Please try again later.",
      );
      return;
    }
  }

  // Route 2: moderation commands must be in guild
  if (!interaction.inGuild() || !interaction.guildId) {
    await safeEphemeralMessage(interaction, "This command can only be used in a server.");
    return;
  }

  // Moderation commands should be ephemeral to reduce channel noise
  await ensureDeferred(interaction, true);

  try {
    const hasPermission = await checkModeratorRole(interaction);
    if (!hasPermission) {
      await safeEphemeralMessage(
        interaction,
        [
          "You do not have permission to use moderation commands.",
          "Ask an admin to set up moderator roles with `/config moderator-role`.",
        ].join("\n"),
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
        await safeEphemeralMessage(interaction, "Unknown subcommand.");
        return;
    }
  } catch (err) {
    logger.error(
      {
        err,
        command: "admin",
        subcommand,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      },
      "[admin] moderation command failed",
    );
    await safeEphemeralMessage(
      interaction,
      "Something went wrong. Please try again later.",
    );
  }
}

async function handleTimeout(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const duration = interaction.options.getInteger("duration", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await safeEphemeralMessage(interaction, "This command can only be used in a server.");
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    if (member.user.bot) {
      await safeEphemeralMessage(interaction, "Cannot timeout bots.");
      return;
    }

    if (member.id === interaction.user.id) {
      await safeEphemeralMessage(interaction, "You cannot timeout yourself.");
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await safeEphemeralMessage(
        interaction,
        "You cannot timeout someone with an equal or higher role.",
      );
      return;
    }

    const durationMs = duration * 60 * 1000;
    await member.timeout(durationMs, reason);

    await interaction.editReply(
      `Timed out **${targetUser.tag}** for **${duration}** minute(s).\nReason: ${reason}`,
    );

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        duration,
        reason,
        guildId: interaction.guildId,
      },
      "[admin] user timed out",
    );
  } catch (err) {
    logger.error(
      { err, targetUser: targetUser.id, guildId: interaction.guildId },
      "[admin] timeout failed",
    );
    await safeEphemeralMessage(
      interaction,
      "Failed to timeout user. Check my permissions and role position.",
    );
  }
}

async function handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await safeEphemeralMessage(interaction, "This command can only be used in a server.");
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    if (member.user.bot) {
      await safeEphemeralMessage(interaction, "Cannot kick bots.");
      return;
    }

    if (member.id === interaction.user.id) {
      await safeEphemeralMessage(interaction, "You cannot kick yourself.");
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await safeEphemeralMessage(
        interaction,
        "You cannot kick someone with an equal or higher role.",
      );
      return;
    }

    if (!member.kickable) {
      await safeEphemeralMessage(
        interaction,
        "I do not have permission to kick this user.",
      );
      return;
    }

    await member.kick(reason);

    await interaction.editReply(`Kicked **${targetUser.tag}**.\nReason: ${reason}`);

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        reason,
        guildId: interaction.guildId,
      },
      "[admin] user kicked",
    );
  } catch (err) {
    logger.error(
      { err, targetUser: targetUser.id, guildId: interaction.guildId },
      "[admin] kick failed",
    );
    await safeEphemeralMessage(
      interaction,
      "Failed to kick user. Check my permissions and role position.",
    );
  }
}

async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

  if (!interaction.guild) {
    await safeEphemeralMessage(interaction, "This command can only be used in a server.");
    return;
  }

  try {
    if (targetUser.id === interaction.user.id) {
      await safeEphemeralMessage(interaction, "You cannot ban yourself.");
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member) {
      if (member.user.bot) {
        await safeEphemeralMessage(interaction, "Cannot ban bots.");
        return;
      }

      const executor = interaction.member as GuildMember;
      if (member.roles.highest.position >= executor.roles.highest.position) {
        await safeEphemeralMessage(
          interaction,
          "You cannot ban someone with an equal or higher role.",
        );
        return;
      }

      if (!member.bannable) {
        await safeEphemeralMessage(
          interaction,
          "I do not have permission to ban this user.",
        );
        return;
      }
    }

    await interaction.guild.members.ban(targetUser.id, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    const deletedText =
      deleteDays > 0 ? `\nMessages deleted: last ${deleteDays} day(s)` : "";
    await interaction.editReply(
      `Banned **${targetUser.tag}**.\nReason: ${reason}${deletedText}`,
    );

    logger.info(
      {
        moderator: interaction.user.tag,
        target: targetUser.tag,
        reason,
        deleteDays,
        guildId: interaction.guildId,
      },
      "[admin] user banned",
    );
  } catch (err) {
    logger.error(
      { err, targetUser: targetUser.id, guildId: interaction.guildId },
      "[admin] ban failed",
    );
    await safeEphemeralMessage(
      interaction,
      "Failed to ban user. Check my permissions and role position.",
    );
  }
}

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const db = getDb();

    const jokeCount = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
      count: number;
    };
    const coinFlipCount = db
      .prepare("SELECT COUNT(*) as count FROM coin_flips")
      .get() as { count: number };

    const funUsage = await getFunUsageSnapshot();

    const totalsByCommand = (funUsage?.totalsByCommand ?? {}) as Record<string, number>;
    const totalCommands = Object.values(totalsByCommand).reduce(
      (sum, count) => sum + (count ?? 0),
      0,
    );

    const uptimeSeconds = process.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const embed = new EmbedBuilder()
      .setTitle("Bot Statistics")
      .setColor(EmbedColors.Info)
      .addFields(
        {
          name: "Uptime",
          value: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
          inline: true,
        },
        { name: "Memory", value: `${memUsedMB}MB / ${memTotalMB}MB`, inline: true },
        { name: "Total Commands", value: totalCommands.toString(), inline: true },
        { name: "Jokes", value: jokeCount.count.toString(), inline: true },
        { name: "Coin Flips", value: coinFlipCount.count.toString(), inline: true },
        {
          name: "Unique Users",
          value: Object.keys(funUsage?.totalsByUser ?? {}).length.toString(),
          inline: true,
        },
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info({ userId: interaction.user.id }, "[admin] viewed bot statistics");
  } catch (error) {
    logger.error({ error }, "[admin] stats failed");
    await safeEphemeralMessage(interaction, "Failed to get statistics.");
  }
}

async function handleHealth(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const checks: { name: string; status: string; details?: string }[] = [];

    try {
      const db = getDb();
      db.prepare("SELECT 1").get();
      checks.push({ name: "Database", status: "Healthy" });
    } catch (error) {
      checks.push({
        name: "Database",
        status: "Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const requiredEnvVars = ["DISCORD_TOKEN", "DISCORD_APP_ID", "DISCORD_GUILD_ID"];
    const missingRequired = requiredEnvVars.filter((v) => !process.env[v]?.trim());

    if (missingRequired.length === 0) {
      checks.push({ name: "Required env", status: "All set" });
    } else {
      checks.push({
        name: "Required env",
        status: "Missing",
        details: missingRequired.join(", "),
      });
    }

    const optionalEnv = [
      { name: "OpenAI", key: "OPENAI_API_KEY" },
      { name: "GitHub", key: "GITHUB_TOKEN" },
      { name: "WeatherAPI", key: "WEATHERAPI_KEY" },
    ];

    for (const item of optionalEnv) {
      checks.push({
        name: item.name,
        status: process.env[item.key]?.trim() ? "Configured" : "Not configured",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Health Check")
      .setColor(EmbedColors.Info)
      .setDescription(
        checks
          .map((c) =>
            c.details
              ? `**${c.name}:** ${c.status}\n${c.details}`
              : `**${c.name}:** ${c.status}`,
          )
          .join("\n\n"),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info({ userId: interaction.user.id }, "[admin] viewed health check");
  } catch (error) {
    logger.error({ error }, "[admin] health check failed");
    await safeEphemeralMessage(interaction, "Failed to run health check.");
  }
}
