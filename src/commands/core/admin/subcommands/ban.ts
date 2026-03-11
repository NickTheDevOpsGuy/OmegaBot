// src/commands/admin/subcommands/ban.ts
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getContextLogger } from "../../../../services/core/logging/requestContext.js";
import { t, resolveLocale } from "../../../../i18n/index.js";
import { safeReply, userFacingError } from "../utils.js";

export async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
  const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);

  if (!interaction.guild) {
    await safeReply(interaction, {
      content: "❌ " + t("common.guild_only", locale),
      ephemeral: true,
    });
    return;
  }

  try {
    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch((): null => null);

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

    getContextLogger().info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason, deleteDays },
      "[admin] user banned",
    );
  } catch (err) {
    getContextLogger().error({ err, targetUser: targetUser.id }, "[admin] ban failed");
    await safeReply(interaction, {
      content: userFacingError(err, locale),
      ephemeral: true,
    });
  }
}
