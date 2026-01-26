// src/commands/starboard/starboard.ts
import {
  SlashCommandBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  getGuildConfig,
  setGuildConfig,
} from "../../services/config/guildConfigStore.js";

export const data = new SlashCommandBuilder()
  .setName("starboard")
  .setDescription("Configure the ⭐ starboard for this server")
  .addSubcommand((s) =>
    s
      .setName("set")
      .setDescription("Enable starboard")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel to post starred messages into")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName("threshold")
          .setDescription("How many ⭐ reactions are needed (default 3)")
          .setMinValue(1)
          .setMaxValue(20)
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("clear")
      .setDescription("Disable starboard")
      .addBooleanOption((o) =>
        o
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("status")
      .setDescription("Show current starboard settings")
      .addBooleanOption((o) =>
        o
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  const guildId = interaction.guildId;

  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);
    const threshold = interaction.options.getInteger("threshold") ?? 3;

    setGuildConfig(guildId, {
      starboardChannelId: channel.id,
      starboardThreshold: threshold,
    });

    await interaction.editReply(
      `⭐ Starboard enabled in ${channel.toString()} (threshold: ${threshold}).`,
    );
    return;
  }

  if (sub === "clear") {
    setGuildConfig(guildId, { starboardChannelId: null });
    await interaction.editReply("⭐ Starboard disabled.");
    return;
  }

  const cfg = getGuildConfig(guildId);
  if (!cfg.starboardChannelId) {
    await interaction.editReply("⭐ Starboard is not enabled.");
    return;
  }

  await interaction.editReply(
    `⭐ Starboard is enabled in <#${cfg.starboardChannelId}> (threshold: ${cfg.starboardThreshold}).`,
  );
}
