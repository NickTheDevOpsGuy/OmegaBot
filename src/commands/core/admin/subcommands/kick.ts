// src/commands/admin/subcommands/kick.ts
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getContextLogger } from "../../../../services/core/logging/requestContext.js";
import { t, resolveLocale } from "../../../../i18n/index.js";
import { safeReply, userFacingError } from "../utils.js";

export async function handleKick(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);

  if (!interaction.guild) {
    await safeReply(interaction, {
      content: "❌ " + t("common.guild_only", locale),
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

    getContextLogger().info(
      { moderator: interaction.user.tag, target: targetUser.tag, reason },
      "[admin] user kicked",
    );
  } catch (err) {
    getContextLogger().error({ err, targetUser: targetUser.id }, "[admin] kick execution threw");
    await safeReply(interaction, {
      content: userFacingError(err, locale),
      ephemeral: true,
    });
  }
}
