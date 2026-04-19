// src/commands/quote-message/quote-message.ts
// Context menu: Right-click message → "Quote" (saves message as quote)

import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageFlags,
  EmbedBuilder,
  type MessageContextMenuCommandInteraction,
} from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { addQuote } from "../../../services/stores/quotes/quoteStore.js";
import { t, resolveLocale } from "../../../i18n/index.js";

export const data = new ContextMenuCommandBuilder()
  .setName("Quote")
  .setType(ApplicationCommandType.Message);

export async function execute(
  interaction: MessageContextMenuCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
      await interaction.editReply(t("quotes.guild_only", locale));
      return;
    }

    const targetMessage = interaction.targetMessage;
    let content = targetMessage.content?.trim() ?? "";

    // Fall back to embed content (title + description) when message has no text
    if (!content && targetMessage.embeds.length > 0) {
      const parts: string[] = [];
      for (const embed of targetMessage.embeds) {
        if (embed.title) parts.push(embed.title);
        if (embed.description) parts.push(embed.description);
      }
      content = parts.join("\n\n").trim();
    }

    if (!content) {
      await interaction.editReply(
        "That message has no quotable text (no content or embed title/description).",
      );
      return;
    }

    const truncated = content.length > 500 ? content.slice(0, 497) + "…" : content;
    const context = targetMessage.url;

    const id = addQuote(
      guildId,
      targetMessage.author.id,
      truncated,
      interaction.user.id,
      context,
    );

    const embed = new EmbedBuilder()
      .setDescription(`"${truncated}"`)
      .setAuthor({
        name: targetMessage.author.username,
        iconURL: targetMessage.author.displayAvatarURL(),
      })
      .setFooter({ text: `Quote #${id} • Added by ${interaction.user.username}` })
      .setColor(0x57f287);

    await interaction.editReply({
      content: `✅ Quote #${id} saved!`,
      embeds: [embed],
    });
  } catch (err) {
    getContextLogger().error(
      { err, command: "quote-message" },
      "[quote-message] save quote threw",
    );
    await interaction.editReply("The quote couldn't be saved. Try again in a moment.");
  }
}
