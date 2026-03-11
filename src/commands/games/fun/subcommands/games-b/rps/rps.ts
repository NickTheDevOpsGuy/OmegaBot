// src/commands/fun/subcommands/rps.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordSoloResult } from "./rpsStore.js";
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
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("opponent");

  if (showStatsFlag) {
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
      await message.edit({
        content: "Pick your choice:",
        embeds: [],
        components: [choiceRow],
      });
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
      const nextEmbed = new EmbedBuilder()
        .setTitle("🪨 Rock Paper Scissors")
        .setDescription(
          [
            `**You** ${EMOJI[nextChoice]}  vs  ${EMOJI[nextBot]} **Bot**`,
            "",
            `${getResultEmoji(nextResult)} **${getResultText(nextResult).toUpperCase()}**`,
          ].join("\n"),
        )
        .setColor(resultColors[nextResult] ?? 0x94a3b8);
      await choiceClick.update({ content: null, embeds: [nextEmbed], components: [] });
    } catch {
      // Timeout — leave the result as is
    }
  } catch (err) {
    logger.error({ err, userId }, "[fun/rps] failed");
    await interaction.editReply("Something went wrong. Try again!");
  }
}
