// src/commands/admin/subcommands/kick.ts
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { safeReply, userFacingError } from "../utils.js";

export async function handleKick(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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
