// src/commands/admin/subcommands/timeout.ts
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getContextLogger } from "../../../../services/core/logging/requestContext.js";
import { t, resolveLocale } from "../../../../i18n/index.js";
import { safeReply, userFacingError } from "../utils.js";

export async function handleTimeout(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const targetUser = interaction.options.getUser("user", true);
  const duration = interaction.options.getInteger("duration", true);
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

    getContextLogger().info(
      { moderator: interaction.user.tag, target: targetUser.tag, duration, reason },
      "[admin] user timed out",
    );
  } catch (err) {
    getContextLogger().error({ err, targetUser: targetUser.id }, "[admin] timeout failed");
    await safeReply(interaction, {
      content: userFacingError(err, locale),
      ephemeral: true,
    });
  }
}
