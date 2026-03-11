// src/commands/suggestion/suggestion.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { t, resolveLocale } from "../../../i18n/index.js";

const MODAL_CUSTOM_ID_PREFIX = "suggestion:";

export const data = new SlashCommandBuilder()
  .setName("suggestion")
  .setDescription("Submit a suggestion (adds 👍/👎 reactions)")
  .addBooleanOption((o) =>
    o
      .setName("private")
      .setDescription("Only show confirmation to you")
      .setRequired(false),
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.reply({
      content: t("common.guild_only", locale),
      ephemeral: true,
    });
    return;
  }

  const isPrivate = interaction.options.getBoolean("private") ?? true;
  const customId = `${MODAL_CUSTOM_ID_PREFIX}${isPrivate ? "private" : "public"}`;

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Submit a Suggestion")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("text")
          .setLabel("Your suggestion")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(1)
          .setMaxLength(1000)
          .setPlaceholder("Describe your idea...")
          .setRequired(true),
      ),
    );

  await interaction.showModal(modal);
}

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith(MODAL_CUSTOM_ID_PREFIX)) return;

  const isPrivate = customId === `${MODAL_CUSTOM_ID_PREFIX}private`;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  const guildId = interaction.guildId;
  if (!guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.editReply(t("common.guild_only", locale));
    return;
  }

  const text = interaction.fields.getTextInputValue("text").trim();
  if (!text) {
    await interaction.editReply("Suggestion cannot be empty.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("💡 New suggestion")
    .setDescription(text)
    .addFields({ name: "From", value: interaction.user.toString(), inline: true })
    .setTimestamp(new Date());

  const channel = interaction.channel;
  if (!channel || !("send" in channel)) {
    await interaction.editReply("Cannot post suggestions in this channel.");
    return;
  }

  try {
    const sent = await channel.send({ embeds: [embed] });
    await sent.react("👍").catch((): null => null);
    await sent.react("👎").catch((): null => null);
    await interaction.editReply("✅ Suggestion posted.");
  } catch (err) {
    getContextLogger().error(
      { err, userId: interaction.user.id },
      "[suggestion] post failed",
    );
    const msg =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 50013
        ? "Couldn't post the suggestion. The bot may lack **Send Messages** or **Embed Links** in this channel."
        : "Couldn't post the suggestion. Please try again or check channel permissions.";
    await interaction.editReply(msg);
  }
}
