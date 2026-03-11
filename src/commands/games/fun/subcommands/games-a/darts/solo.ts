// src/commands/fun/subcommands/darts/solo.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { DARTS_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  checkDartsCooldown,
  formatCooldownMessage,
  recordDartsThrow,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { recordSoloThrow } from "./dartsStore.js";
import { DARTBOARD_ART, doThrow, formatThrowLines } from "./gameLogic.js";

function buildThrowEmbed(
  hits: ReturnType<typeof doThrow>["hits"],
  score: number,
  is180: boolean,
  achievementLine?: string,
): EmbedBuilder {
  const throwLines = formatThrowLines(hits, score);
  const embed = new EmbedBuilder()
    .setTitle("🎯 Darts")
    .setDescription([DARTBOARD_ART, "", throwLines.join("\n")].join("\n"))
    .setColor(is180 ? 0xffd700 : score >= 100 ? 0x22c55e : 0x64748b);
  if (achievementLine) embed.setFooter({ text: achievementLine });
  return embed;
}

export async function runSoloThrow(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const remaining = checkDartsCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(
        remaining,
        DARTS_COOLDOWN_MS / 1000,
        "darts",
        interaction.guild?.preferredLocale ?? null,
      ),
    );
    return;
  }

  const { hits, score, is180 } = doThrow();
  recordDartsThrow(interaction.user.id);
  const achievementLine = is180
    ? getNewlyUnlockedAchievementLine(interaction.user.id, getDb(), () =>
        recordSoloThrow(interaction.user.id, score, is180),
      )
    : (recordSoloThrow(interaction.user.id, score, is180), undefined);

  const embed = buildThrowEmbed(hits, score, is180, achievementLine);
  const throwAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("darts-solo-again")
      .setLabel("Throw again")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎯"),
  );
  const message = await interaction.editReply({
    embeds: [embed],
    components: [throwAgainRow],
  });

  logger.info(
    { userId: interaction.user.id, hits: hits.map((h) => h.value), score },
    "[darts] solo throw complete",
  );

  try {
    const againClick = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) =>
        i.user.id === interaction.user.id && i.customId === "darts-solo-again",
      time: 30_000,
    });
    await againClick.deferUpdate();
    const remaining2 = checkDartsCooldown(interaction.user.id);
    if (remaining2 > 0) {
      await message.edit({
        embeds: [embed],
        components: [],
        content: `⏱️ Wait ${remaining2}s before throwing again.`,
      });
      return;
    }
    const { hits: hits2, score: score2, is180: is1802 } = doThrow();
    recordDartsThrow(interaction.user.id);
    const achievementLine2 = is1802
      ? getNewlyUnlockedAchievementLine(interaction.user.id, getDb(), () =>
          recordSoloThrow(interaction.user.id, score2, is1802),
        )
      : (recordSoloThrow(interaction.user.id, score2, is1802), undefined);
    const embed2 = buildThrowEmbed(hits2, score2, is1802, achievementLine2);
    await message.edit({ embeds: [embed2], components: [] });
  } catch {
    // Timeout
  }
}
