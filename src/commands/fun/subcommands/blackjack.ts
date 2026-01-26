// src/commands/fun/subcommands/blackjack.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { logger } from "../../../utils/logger.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const hit = new ButtonBuilder()
      .setCustomId("blackjack_hit")
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary);

    const stand = new ButtonBuilder()
      .setCustomId("blackjack_stand")
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(hit, stand);

    // ✅ prefer-const fix: msg is not reassigned
    const msg = await interaction.editReply({
      content: "🃏 Blackjack started! (placeholder)",
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: "Not your game.", ephemeral: true });
        return;
      }

      if (btn.customId === "blackjack_hit") {
        await btn.update({ content: "You chose: Hit (placeholder)", components: [row] });
        return;
      }

      if (btn.customId === "blackjack_stand") {
        await btn.update({ content: "You chose: Stand (placeholder)", components: [] });
        collector.stop("stand");
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (err) {
        logger.debug({ err }, "[blackjack] failed to clear components");
      }
    });
  } catch (err) {
    logger.error({ err }, "[blackjack] failed");
    await interaction.editReply("Blackjack failed. Try again.");
  }
}
