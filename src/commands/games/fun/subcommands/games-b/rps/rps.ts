// src/commands/fun/subcommands/rps.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { getUserFacingReason } from "../../../../../../utils/errors.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordSoloResult } from "./rpsStore.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";
import {
  CHOICES,
  EMOJI,
  getBotChoice,
  getResult,
  getResultEmoji,
  getResultText,
  type Choice,
} from "./gameLogic.js";
import { handleChallenge } from "./challenge.js";
import { showStats } from "./stats.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const view =
    interaction.options.getString("view") ??
    ((interaction.options.getBoolean("stats") ?? false) ? "stats" : "play");
  const opponent = interaction.options.getUser("opponent");

  if (view === "stats") {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (opponent) {
    await handleChallenge(interaction, opponent);
    return;
  }

  const choiceInput = interaction.options.getString("choice");

  if (!choiceInput) {
    await interaction.editReply(
      "Pick rock, paper, or scissors to play against the bot, or use `opponent:@user` to challenge someone!",
    );
    return;
  }

  const choice = choiceInput.toLowerCase();
  const userId = interaction.user.id;

  if (!CHOICES.includes(choice as Choice)) {
    await interaction.editReply("Invalid choice! Pick `rock`, `paper`, or `scissors`.");
    return;
  }

  const playerChoice = choice as Choice;

  try {
    const botChoice = getBotChoice();
    const result = getResult(playerChoice, botChoice);

    logger.info({ userId, result }, "[rps] solo game");

    recordSoloResult(userId, result);
    const xpResult = awardXp(userId, result === "win" ? 14 : result === "tie" ? 8 : 5);

    const resultColors: Record<import("./gameLogic.js").Result, number> = {
      win: 0x22c55e,
      lose: 0xef4444,
      tie: 0x94a3b8,
    };
    const embed = new EmbedBuilder()
      .setTitle("🪨 Rock Paper Scissors")
      .setDescription(
        [
          `**You** ${EMOJI[playerChoice]}  vs  ${EMOJI[botChoice]} **Bot**`,
          "",
          `${getResultEmoji(result)} **${getResultText(result).toUpperCase()}**`,
          "",
          xpResult.leveledUp
            ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
            : `✨ +${xpResult.amount} XP`,
        ].join("\n"),
      )
      .setColor(resultColors[result]);

    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("rps-solo-again")
        .setLabel("Play again")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🪨"),
    );
    const message = await interaction.editReply({
      embeds: [embed],
      components: [playAgainRow],
    });

    try {
      const againClick = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) =>
          i.user.id === interaction.user.id && i.customId === "rps-solo-again",
        time: 30_000,
      });
      await againClick.deferUpdate();
      const choiceRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("rps-solo:rock")
          .setLabel("Rock")
          .setEmoji("🪨")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("rps-solo:paper")
          .setLabel("Paper")
          .setEmoji("📄")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("rps-solo:scissors")
          .setLabel("Scissors")
          .setEmoji("✂️")
          .setStyle(ButtonStyle.Secondary),
      );
      const ok = await safeMessageEdit(
        message,
        { content: "Pick your choice:", embeds: [], components: [choiceRow] },
        "rps.solo.choice",
        interaction,
      ).catch(() => false);
      if (!ok) {
        await notifyGameMessageGone(againClick, "rps").catch(() => {});
        return;
      }
      const choiceClick = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) =>
          i.user.id === interaction.user.id && i.customId.startsWith("rps-solo:"),
        time: 30_000,
      });
      const nextChoice = choiceClick.customId.split(":")[1] as Choice;
      const nextBot = getBotChoice();
      const nextResult = getResult(nextChoice, nextBot);
      recordSoloResult(userId, nextResult);
      const nextXpResult = awardXp(
        userId,
        nextResult === "win" ? 14 : nextResult === "tie" ? 8 : 5,
      );
      const nextEmbed = new EmbedBuilder()
        .setTitle("🪨 Rock Paper Scissors")
        .setDescription(
          [
            `**You** ${EMOJI[nextChoice]}  vs  ${EMOJI[nextBot]} **Bot**`,
            "",
            `${getResultEmoji(nextResult)} **${getResultText(nextResult).toUpperCase()}**`,
            "",
            nextXpResult.leveledUp
              ? `✨ +${nextXpResult.amount} XP • Level ${nextXpResult.after.level}!`
              : `✨ +${nextXpResult.amount} XP`,
          ].join("\n"),
        )
        .setColor(resultColors[nextResult] ?? 0x94a3b8);
      await choiceClick.update({ content: null, embeds: [nextEmbed], components: [] });
    } catch {
      // Timeout — leave the result as is
    }
  } catch (err) {
    getContextLogger().error({ err, userId }, "[fun/rps] RPS handler threw");
    await interaction.editReply(`❌ ${getUserFacingReason(err)}`);
  }
}
