// src/commands/fun/subcommands/rps.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { recordSoloResult } from "./rpsStore.js";
import {
  CHOICES,
  EMOJI,
  getBotChoice,
  getResult,
  getResultEmoji,
  getResultText,
  type Choice,
} from "./rps/gameLogic.js";
import { handleChallenge } from "./rps/challenge.js";
import { showStats } from "./rps/stats.js";

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

    const lines: string[] = [];
    lines.push(`${EMOJI[playerChoice]} **You** vs **Bot** ${EMOJI[botChoice]}`);
    lines.push("");
    lines.push(`${getResultEmoji(result)} **${getResultText(result)}**`);

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    logger.error({ err, userId }, "[fun/rps] failed");
    await interaction.editReply("Something went wrong. Try again!");
  }
}
