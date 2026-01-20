// src/commands/admin/admin.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
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
  )
  .setDMPermission(true);

/* -------------------------------------------------------------------------- */
/* Reply helpers                                                              */
/* -------------------------------------------------------------------------- */

type ReplyPayload = {
  content?: string;
  embeds?: EmbedBuilder[];
  ephemeral?: boolean;
};

async function safeReply(
  interaction: ChatInputCommandInteraction,
  payload: ReplyPayload,
): Promise<void> {
  try {
    const { content, embeds, ephemeral } = payload;

    // If deferred/replied, follow up or edit reply.
    // You currently use deferReply, so editReply is appropriate.
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content, embeds });
      return;
    }

    await interaction.reply({
      content,
      embeds,
      ephemeral: Boolean(ephemeral),
    });
  } catch (err) {
    logger.error({ err }, "[admin] failed to reply/editReply");
  }
}

function userFacingError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  const low = msg.toLowerCase();

  if (low.includes("missing permissions")) {
    return (
      "❌ I am missing required permissions.\n" +
      "Check my role permissions, and make sure my role is above the target user's role."
    );
  }

  if (low.includes("unknown interaction")) {
    return "❌ That took too long and Discord expired the command. Try again.";
  }

  return "❌ Command failed. Check my permissions and role position.";
}

/* -------------------------------------------------------------------------- */
/* Retry helpers (cuts down flakiness)                                        */
/* -------------------------------------------------------------------------- */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function looksRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  // common sqlite transient errors
  return (
    low.includes("sqlite_busy") ||
    low.includes("database is locked") ||
    low.includes("busy")
  );
}

async function withRetry<T>(
  label: string,
  fn: () => T | Promise<T>,
  attempts = 3,
  baseDelayMs = 75,
): Promise<T> {
  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const retryable = looksRetryable(err);
      logger.warn(
        { err, label, attempt: i + 1, attempts, retryable },
        "[admin] operation failed",
      );

      if (!retryable || i === attempts - 1) break;

      // small backoff
      await sleep(baseDelayMs * (i + 1));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/* -------------------------------------------------------------------------- */
/* Execute                                                                    */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand(true);

  try {
    // Keep moderation private by default; stats/health can be public
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
/* Moderation handlers                                                        */
/* -------------------------------------------------------------------------- */

async function handleTimeout(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const duration = interaction.options.getInteger("duration", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await safeReply(interaction, {
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    if (member.user.bot) {
      await safeReply(interaction, {
        content: "❌ Cannot timeout bots.",
        ephemeral: true,
      });
      return;
    }
    if (member.id === interaction.user.id) {
      await safeReply(interaction, {
        content: "❌ You cannot timeout yourself.",
        ephemeral: true,
      });
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await safeReply(interaction, {
        content: "❌ You cannot timeout someone with an equal or higher role.",
        ephemeral: true,
      });
      return;
    }

    const durationMs = duration * 60 * 1000;
    await member.timeout(durationMs, reason);

    await safeReply(interaction, {
      content: `✅ ${targetUser.tag} has been timed out for ${duration} minute(s).\nReason: ${reason}`,
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, duration, reason },
      "[admin] user timed out",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] timeout failed");
    await safeReply(interaction, {
      content: userFacingError(err),
      ephemeral: true,
    });
  }
}

async function handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  if (!interaction.guild) {
    await safeReply(interaction, {
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);

    if (member.user.bot) {
      await safeReply(interaction, {
        content: "❌ Cannot kick bots.",
        ephemeral: true,
      });
      return;
    }
    if (member.id === interaction.user.id) {
      await safeReply(interaction, {
        content: "❌ You cannot kick yourself.",
        ephemeral: true,
      });
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await safeReply(interaction, {
        content: "❌ You cannot kick someone with an equal or higher role.",
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await safeReply(interaction, {
        content:
          "❌ I don't have permission to kick this user.\nCheck my role position and Kick Members permission.",
        ephemeral: true,
      });
      return;
    }

    await member.kick(reason);

    await safeReply(interaction, {
      content: `✅ ${targetUser.tag} has been kicked.\nReason: ${reason}`,
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason },
      "[admin] user kicked",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] kick failed");
    await safeReply(interaction, {
      content: userFacingError(err),
      ephemeral: true,
    });
  }
}

async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

  if (!interaction.guild) {
    await safeReply(interaction, {
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetUser.id === interaction.user.id) {
      await safeReply(interaction, {
        content: "❌ You cannot ban yourself.",
        ephemeral: true,
      });
      return;
    }

    if (member) {
      if (member.user.bot) {
        await safeReply(interaction, {
          content: "❌ Cannot ban bots.",
          ephemeral: true,
        });
        return;
      }

      const executor = interaction.member as GuildMember;
      if (member.roles.highest.position >= executor.roles.highest.position) {
        await safeReply(interaction, {
          content: "❌ You cannot ban someone with an equal or higher role.",
          ephemeral: true,
        });
        return;
      }

      if (!member.bannable) {
        await safeReply(interaction, {
          content:
            "❌ I don't have permission to ban this user.\nCheck my role position and Ban Members permission.",
          ephemeral: true,
        });
        return;
      }
    }

    await interaction.guild.members.ban(targetUser.id, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    await safeReply(interaction, {
      content:
        `✅ ${targetUser.tag} has been banned.\nReason: ${reason}` +
        (deleteDays > 0 ? `\nMessages deleted: last ${deleteDays} day(s)` : ""),
    });

    logger.info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason, deleteDays },
      "[admin] user banned",
    );
  } catch (err) {
    logger.error({ err, targetUser: targetUser.id }, "[admin] ban failed");
    await safeReply(interaction, {
      content: userFacingError(err),
      ephemeral: true,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Stats + Health                                                             */
/* -------------------------------------------------------------------------- */

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  // Goal: do not hard-fail if one piece flakes, show N/A and log the real error
  let jokeCount: number | null = null;
  let coinFlipCount: number | null = null;
  let totalCommands = 0;
  let uniqueUsers = 0;

  try {
    const db = getDb();

    jokeCount = await withRetry("stats:jokesCount", () => {
      const row = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
        count: number;
      };
      return row.count;
    });

    coinFlipCount = await withRetry("stats:coinFlipCount", () => {
      const row = db.prepare("SELECT COUNT(*) as count FROM coin_flips").get() as {
        count: number;
      };
      return row.count;
    });
  } catch (err) {
    logger.error({ err }, "[admin] stats DB counts failed");
  }

  try {
    const funUsage = await withRetry("stats:funUsageSnapshot", () =>
      getFunUsageSnapshot(),
    );
    const totals = (funUsage?.totalsByCommand ?? {}) as Record<string, number>;
    totalCommands = Object.values(totals).reduce(
      (sum, count) => sum + (Number.isFinite(count) ? count : 0),
      0,
    );
    uniqueUsers = Object.keys(funUsage?.totalsByUser ?? {}).length;
  } catch (err) {
    logger.error({ err }, "[admin] stats fun usage failed");
  }

  try {
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
        { name: "Total Commands", value: String(totalCommands), inline: true },
        {
          name: "Jokes",
          value: jokeCount === null ? "N/A" : String(jokeCount),
          inline: true,
        },
        {
          name: "Coin Flips",
          value: coinFlipCount === null ? "N/A" : String(coinFlipCount),
          inline: true,
        },
        { name: "Unique Users", value: String(uniqueUsers), inline: true },
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed] });
    logger.info({ userId: interaction.user.id }, "[admin] viewed stats");
  } catch (err) {
    logger.error({ err }, "[admin] stats reply failed");
    await safeReply(interaction, {
      content: "❌ Failed to get statistics",
      ephemeral: true,
    });
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

    const requiredEnvVars = ["DISCORD_TOKEN", "DISCORD_APP_ID"];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length === 0) {
      checks.push({ name: "Environment", status: "✅ Required vars set" });
    } else {
      checks.push({
        name: "Environment",
        status: "⚠️ Missing vars",
        details: missingVars.join(", "),
      });
    }

    const optionalKeys = [
      { name: "Anthropic (Claude)", key: "ANTHROPIC_API_KEY" },
      { name: "GitHub", key: "GITHUB_TOKEN" },
      { name: "Weather API", key: "WEATHERAPI_KEY" },
    ];

    for (const { name, key } of optionalKeys) {
      checks.push({
        name,
        status: process.env[key] ? "✅ Configured" : "⚠️ Not configured",
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

    await safeReply(interaction, { embeds: [embed], ephemeral: true });
    logger.info({ userId: interaction.user.id }, "[admin] viewed health");
  } catch (error) {
    logger.error({ error }, "[admin] health check failed");
    await safeReply(interaction, {
      content: "❌ Failed to run health check",
      ephemeral: true,
    });
  }
}