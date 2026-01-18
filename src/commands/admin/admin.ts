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
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  // Handle stats and health (no moderation check needed)
  if (subcommand === "stats") {
    await interaction.deferReply();
    await handleStats(interaction);
    return;
  }

  if (subcommand === "health") {
    await interaction.deferReply();
    await handleHealth(interaction);
    return;
  }

  // For moderation commands, check permissions
  try {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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

async function checkModeratorRole(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.inGuild() || !interaction.member) {
    return false;
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  try {
    const db = getDb();
    const guildId = interaction.guildId!;

    const roles = db
      .prepare(`SELECT role_id FROM moderator_roles WHERE guild_id = ?`)
      .all(guildId) as Array<{ role_id: string }>;

    if (roles.length === 0) {
      return false;
    }

    const member = interaction.member as GuildMember;
    const memberRoles = member.roles.cache;

    return roles.some((r) => memberRoles.has(r.role_id));
  } catch (err) {
    logger.error({ err }, "[admin] failed to check moderator role");
    return false;
  }
}

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

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: "❌ You cannot timeout someone with an equal or higher role.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const durationMs = duration * 60 * 1000;
    await member.timeout(durationMs, reason);

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been timed out for ${duration} minute(s).\n**Reason:** ${reason}`,
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, duration, reason },
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

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: "❌ You cannot kick someone with an equal or higher role.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "❌ I don't have permission to kick this user.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await member.kick(reason);

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been kicked.\n**Reason:** ${reason}`,
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason },
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

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot ban yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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

    await interaction.guild.members.ban(targetUser.id, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    await interaction.reply({
      content: `✅ ${targetUser.tag} has been banned.\n**Reason:** ${reason}${deleteDays > 0 ? `\n**Messages deleted:** Last ${deleteDays} day(s)` : ""}`,
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason, deleteDays },
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
    const totalCommands = Object.values(funUsage.totalsByCommand).reduce(
      (sum, count) => sum + count,
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
      .setTitle("🤖 Bot Statistics")
      .setColor(EmbedColors.Info)
      .addFields(
        {
          name: "⏱️ Uptime",
          value: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
          inline: true,
        },
        {
          name: "💾 Memory",
          value: `${memUsedMB}MB / ${memTotalMB}MB`,
          inline: true,
        },
        {
          name: "📊 Total Commands",
          value: totalCommands.toString(),
          inline: true,
        },
        {
          name: "🎭 Jokes",
          value: jokeCount.count.toString(),
          inline: true,
        },
        {
          name: "🪙 Coin Flips",
          value: coinFlipCount.count.toString(),
          inline: true,
        },
        {
          name: "👥 Unique Users",
          value: Object.keys(funUsage.totalsByUser).length.toString(),
          inline: true,
        },
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info({ userId: interaction.user.id }, "[admin] Viewed bot statistics");
  } catch (error) {
    logger.error({ error }, "[admin] stats failed");
    await interaction.editReply("❌ Failed to get statistics");
  }
}

async function handleHealth(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const checks: { name: string; status: string; details?: string }[] = [];

    try {
      const db = getDb();
      db.prepare("SELECT 1").get();
      checks.push({ name: "Database", status: "✅ Healthy" });
    } catch (error) {
      checks.push({
        name: "Database",
        status: "❌ Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const requiredEnvVars = [
      "DISCORD_TOKEN",
      "DISCORD_APP_ID",
      "GITHUB_TOKEN",
      "GITHUB_OWNER",
      "GITHUB_REPO",
    ];

    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
    if (missingVars.length === 0) {
      checks.push({ name: "Environment", status: "✅ All vars set" });
    } else {
      checks.push({
        name: "Environment",
        status: "⚠️ Missing vars",
        details: missingVars.join(", "),
      });
    }

    const optionalKeys = [
      { name: "Anthropic API", key: "ANTHROPIC_API_KEY" },
      { name: "Weather API", key: "WEATHERAPI_KEY" },
    ];

    optionalKeys.forEach(({ name, key }) => {
      if (process.env[key]) {
        checks.push({ name, status: "✅ Configured" });
      } else {
        checks.push({ name, status: "⚠️ Not configured" });
      }
    });

    const embed = new EmbedBuilder()
      .setTitle("🏥 Health Check")
      .setColor(EmbedColors.Info)
      .setDescription(
        checks
          .map((c) =>
            c.details
              ? `**${c.name}:** ${c.status}\n  ${c.details}`
              : `**${c.name}:** ${c.status}`,
          )
          .join("\n\n"),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info({ userId: interaction.user.id }, "[admin] Viewed health check");
  } catch (error) {
    logger.error({ error }, "[admin] health check failed");
    await interaction.editReply("❌ Failed to run health check");
  }
}
