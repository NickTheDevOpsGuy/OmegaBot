import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  addWarning,
  clearWarning,
  listWarnings,
} from "../../../services/stores/serverTools/warningsStore.js";

export const data = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("Manage member warnings")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Warn a member")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to warn").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Warning reason").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List active warnings for a member")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to inspect").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear one warning by ID")
      .addIntegerOption((opt) =>
        opt.setName("id").setDescription("Warning ID").setRequired(true),
      ),
  );

export const group = "core";
export const adminOnly = true;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Warnings are server-only.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "add") {
    const user = interaction.options.getUser("user", true);
    const warning = addWarning({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: interaction.options.getString("reason", true),
    });

    await interaction.reply({
      content: `✅ Warned <@${user.id}>. Warning ID: **${warning.id}**`,
      allowedMentions: { users: [user.id] },
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "clear") {
    const id = interaction.options.getInteger("id", true);
    const cleared = clearWarning(interaction.guildId, id);
    await interaction.reply({
      content: cleared ? "✅ Warning cleared." : "No active warning found with that ID.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser("user", true);
  const warnings = listWarnings(interaction.guildId, user.id);
  await interaction.reply({
    content:
      warnings.length > 0
        ? warnings
            .slice(0, 15)
            .map(
              (warning) =>
                `**${warning.id}** • ${warning.reason} • <t:${Math.floor(
                  warning.createdAt / 1000,
                )}:R> • ${warning.source}`,
            )
            .join("\n")
        : `<@${user.id}> has no active warnings.`,
    allowedMentions: { users: [] },
    flags: MessageFlags.Ephemeral,
  });
}
