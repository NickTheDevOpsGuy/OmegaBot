import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  deleteCustomCommand,
  listCustomCommands,
  upsertCustomCommand,
} from "../../../services/stores/serverTools/customCommandStore.js";

export const data = new SlashCommandBuilder()
  .setName("custom-commands")
  .setDescription("Manage bang-style custom commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Create or update a custom !command")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Command name").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("response")
          .setDescription("Response text. Supports {user}, {username}, {server}, {channel}")
          .setRequired(true)
          .setMaxLength(1900),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a custom !command")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Command name").setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("List custom commands"));

export const group = "core";
export const adminOnly = true;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Custom commands are server-only.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "set") {
    const command = upsertCustomCommand({
      guildId: interaction.guildId,
      name: interaction.options.getString("name", true),
      response: interaction.options.getString("response", true),
      createdBy: interaction.user.id,
    });
    await interaction.reply({
      content: `✅ Custom command saved. Members can use \`!${command.name}\`.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "remove") {
    const removed = deleteCustomCommand(
      interaction.guildId,
      interaction.options.getString("name", true),
    );
    await interaction.reply({
      content: removed ? "✅ Custom command removed." : "No matching command found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const commands = listCustomCommands(interaction.guildId);
  await interaction.reply({
    content:
      commands.length > 0
        ? commands
            .slice(0, 25)
            .map((command) => `\`!${command.name}\` • ${command.uses} uses`)
            .join("\n")
        : "No custom commands configured.",
    flags: MessageFlags.Ephemeral,
  });
}
