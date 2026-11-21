import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  addBannedWord,
  getAutomodSettings,
  listBannedWords,
  removeBannedWord,
  setAutomodSettings,
} from "../../../services/stores/serverTools/automodStore.js";

export const data = new SlashCommandBuilder()
  .setName("automod")
  .setDescription("Configure automatic moderation filters")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName("enable").setDescription("Enable automod"))
  .addSubcommand((sub) => sub.setName("disable").setDescription("Disable automod"))
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Toggle automod filters")
      .addBooleanOption((opt) =>
        opt.setName("invites").setDescription("Delete Discord invite links"),
      )
      .addBooleanOption((opt) => opt.setName("links").setDescription("Delete web links"))
      .addBooleanOption((opt) =>
        opt.setName("caps").setDescription("Delete excessive caps messages"),
      )
      .addBooleanOption((opt) =>
        opt.setName("spam").setDescription("Delete message spam bursts"),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("word-add")
      .setDescription("Add a banned word")
      .addStringOption((opt) =>
        opt.setName("word").setDescription("Word or phrase").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("word-remove")
      .setDescription("Remove a banned word")
      .addStringOption((opt) =>
        opt.setName("word").setDescription("Word or phrase").setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName("status").setDescription("Show automod status"));

export const group = "core";
export const adminOnly = true;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Automod is server-only.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "enable" || sub === "disable") {
    const settings = setAutomodSettings(interaction.guildId, {
      enabled: sub === "enable",
    });
    await interaction.reply({
      content: `✅ Automod ${settings.enabled ? "enabled" : "disabled"}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "set") {
    const settings = setAutomodSettings(interaction.guildId, {
      blockInvites: interaction.options.getBoolean("invites") ?? undefined,
      blockLinks: interaction.options.getBoolean("links") ?? undefined,
      blockCaps: interaction.options.getBoolean("caps") ?? undefined,
      blockSpam: interaction.options.getBoolean("spam") ?? undefined,
    });
    await interaction.reply({
      content: [
        "✅ Automod filters updated.",
        `Invites: ${settings.blockInvites ? "on" : "off"}`,
        `Links: ${settings.blockLinks ? "on" : "off"}`,
        `Caps: ${settings.blockCaps ? "on" : "off"}`,
        `Spam: ${settings.blockSpam ? "on" : "off"}`,
      ].join("\n"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "word-add") {
    const word = addBannedWord(
      interaction.guildId,
      interaction.options.getString("word", true),
      interaction.user.id,
    );
    await interaction.reply({
      content: `✅ Added banned word: \`${word}\``,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "word-remove") {
    const word = interaction.options.getString("word", true);
    const removed = removeBannedWord(interaction.guildId, word);
    await interaction.reply({
      content: removed ? "✅ Banned word removed." : "No matching banned word found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = getAutomodSettings(interaction.guildId);
  const words = listBannedWords(interaction.guildId);
  await interaction.reply({
    content: [
      "**Automod Status**",
      `Enabled: ${settings.enabled ? "yes" : "no"}`,
      `Invites: ${settings.blockInvites ? "on" : "off"}`,
      `Links: ${settings.blockLinks ? "on" : "off"}`,
      `Caps: ${settings.blockCaps ? "on" : "off"} (${settings.capsPercent}%)`,
      `Spam: ${settings.blockSpam ? "on" : "off"} (${settings.spamMessageCount}/${settings.spamWindowSeconds}s)`,
      `Banned words: ${words.length > 0 ? words.map((word) => `\`${word}\``).join(", ") : "none"}`,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}
