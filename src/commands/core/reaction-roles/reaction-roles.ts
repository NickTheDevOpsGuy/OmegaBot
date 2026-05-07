import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import {
  addReactionRole,
  listReactionRoles,
  removeReactionRole,
} from "../../../services/stores/serverTools/reactionRoleStore.js";

export const data = new SlashCommandBuilder()
  .setName("reaction-roles")
  .setDescription("Manage self-assignable reaction roles")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Attach a role to a reaction on an existing message")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel containing the message")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      )
      .addStringOption((opt) =>
        opt.setName("message_id").setDescription("Target message ID").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("emoji").setDescription("Emoji users react with").setRequired(true),
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to give/remove").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a reaction role mapping")
      .addStringOption((opt) =>
        opt.setName("message_id").setDescription("Target message ID").setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName("emoji").setDescription("Mapped emoji").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List reaction role mappings"),
  );

export const group = "core";
export const adminOnly = true;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Reaction roles are server-only.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "add") {
    const channel = interaction.options.getChannel("channel", true);
    const messageId = interaction.options.getString("message_id", true).trim();
    const emoji = interaction.options.getString("emoji", true).trim();
    const role = interaction.options.getRole("role", true);

    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please choose a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const textChannel = channel as TextChannel;
    const message = await textChannel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({
        content: "I could not fetch that message. Check the channel and message ID.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    addReactionRole({
      guildId: interaction.guildId,
      messageId,
      emoji,
      roleId: role.id,
      channelId: channel.id,
      createdBy: interaction.user.id,
    });
    await message.react(emoji).catch(() => null);

    await interaction.reply({
      content: `✅ Reaction role saved: ${emoji} on ${message.url} gives <@&${role.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "remove") {
    const removed = removeReactionRole(
      interaction.guildId,
      interaction.options.getString("message_id", true),
      interaction.options.getString("emoji", true),
    );
    await interaction.reply({
      content: removed ? "✅ Reaction role removed." : "No matching mapping found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mappings = listReactionRoles(interaction.guildId);
  await interaction.reply({
    content:
      mappings.length > 0
        ? mappings
            .slice(0, 20)
            .map(
              (mapping) =>
                `${mapping.emoji} • <#${mapping.channelId}>/${mapping.messageId} • <@&${mapping.roleId}>`,
            )
            .join("\n")
        : "No reaction roles configured.",
    flags: MessageFlags.Ephemeral,
  });
}
