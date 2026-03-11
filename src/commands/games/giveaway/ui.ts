// src/commands/giveaway/ui.ts
// Giveaway embed and button builders.

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { z } from "zod";
import type { Giveaway } from "./giveawayStore.js";
import { formatTimeLeft } from "./utils.js";

const WinnersSchema = z.array(z.string());

export function buildGiveawayEmbed(giveaway: Giveaway, entryCount: number): EmbedBuilder {
  const timeLeft = formatTimeLeft(giveaway.ends_at);
  const ended = giveaway.ended === 1;

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY")
    .setDescription(`**${giveaway.prize}**`)
    .setColor(ended ? 0x808080 : 0x5865f2)
    .addFields(
      { name: "Hosted by", value: `<@${giveaway.host_id}>`, inline: true },
      { name: "Winners", value: `${giveaway.winner_count}`, inline: true },
      { name: "Entries", value: `${entryCount}`, inline: true },
    )
    .setFooter({ text: ended ? "Giveaway ended" : `Ends in ${timeLeft}` })
    .setTimestamp(giveaway.ends_at);

  if (ended && giveaway.winners) {
    let winners: string[] = [];
    try {
      const parsed = WinnersSchema.safeParse(
        JSON.parse(giveaway.winners) as unknown,
      );
      winners = parsed.success ? parsed.data : [];
    } catch {
      winners = [];
    }
    if (winners.length > 0) {
      embed.addFields({
        name: "🏆 Winners",
        value: winners.map((w) => `<@${w}>`).join(", "),
        inline: false,
      });
    } else {
      embed.addFields({ name: "🏆 Winners", value: "No entries", inline: false });
    }
  }

  return embed;
}

export function buildGiveawayButtons(
  giveawayId: number,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:${giveawayId}:enter`)
      .setLabel("Enter")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎉")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`giveaway:${giveawayId}:leave`)
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}
