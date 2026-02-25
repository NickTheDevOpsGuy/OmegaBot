// src/commands/fun/subcommands/rps.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { safeReplyToButton } from "../../../services/discord/safeReply.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../services/discord/interactionErrors.js";
import {
  recordSoloResult,
  getSoloStats,
  recordPvpResult,
  getPvpStats,
  getH2HStats,
} from "./rpsStore.js";
import {
  CHOICES,
  EMOJI,
  CHOICE_LABELS,
  getBotChoice,
  getResult,
  getResultEmoji,
  getResultText,
  type Choice,
} from "./rps/gameLogic.js";
import { buildChoiceButtons, buildDeclineButton, buildExtendButton } from "./rps/ui.js";

import { GAME_TIMEOUT_MS } from "../../../constants.js";

const CHALLENGE_TIMEOUT_MS = GAME_TIMEOUT_MS;

/* -------------------------------------------------------------------------- */
/* Challenge handler                                                           */
/* -------------------------------------------------------------------------- */

async function handleChallenge(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  if (opponent.id === challenger.id) {
    await interaction.editReply(
      "You can't challenge yourself! Try `/fun rps` to play against the bot.",
    );
    return;
  }

  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Try `/fun rps` to play against me instead.",
    );
    return;
  }

  const challengeId = `${Date.now()}-${challenger.id}`;

  logger.info(
    { challengeId, challengerId: challenger.id, opponentId: opponent.id },
    "[rps] challenge started",
  );

  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Head-to-head: ${challenger.username} ${h2h.user1Wins} - ${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const challengeMessage = await interaction.editReply({
    content: [
      `⚔️ **Rock Paper Scissors Challenge!**`,
      ``,
      `${challenger} challenges ${opponent} to a duel!`,
      `${h2hText}`,
      ``,
      `Both players: click your choice below.`,
      `⏱️ You have 1 hour! (Starter can extend)`,
    ].join("\n"),
    components: [
      buildChoiceButtons(challengeId),
      buildDeclineButton(challengeId),
      buildExtendButton(challengeId),
    ],
  });

  const choices: Map<string, Choice> = new Map();
  const allowedPlayers = new Set([challenger.id, opponent.id]);

  const collector = challengeMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CHALLENGE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`rps:${challengeId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    try {
      const playerId = buttonInteraction.user.id;

      if (!allowedPlayers.has(playerId)) {
        await safeReplyToButton(buttonInteraction, "This challenge isn't for you!");
        return;
      }

      const action = buttonInteraction.customId.split(":")[2] as
      | Choice
      | "decline"
      | "extend";

    if (action === "extend") {
      if (playerId !== challenger.id) {
        await safeReplyToButton(
          buttonInteraction,
          "Only the person who started the challenge can extend time.",
        );
        return;
      }
      collector.resetTimer();
      await buttonInteraction.deferUpdate();
      await interaction.editReply({
        content: [
          `⚔️ **Rock Paper Scissors Challenge!**`,
          ``,
          `${challenger} challenges ${opponent} to a duel!`,
          `${h2hText}`,
          ``,
          `Both players: click your choice below.`,
          `⏱️ **Time extended!** You have another hour.`,
        ].join("\n"),
        components: [
          buildChoiceButtons(challengeId),
          buildDeclineButton(challengeId),
          buildExtendButton(challengeId),
        ],
      });
      return;
    }

    if (action === "decline") {
      if (playerId === opponent.id) {
        collector.stop("declined");
        await buttonInteraction.update({
          content: `❌ ${opponent} declined the challenge.`,
          components: [],
        });
        return;
      } else {
        collector.stop("cancelled");
        await buttonInteraction.update({
          content: `❌ ${challenger} cancelled the challenge.`,
          components: [],
        });
        return;
      }
    }

    if (CHOICES.includes(action)) {
      choices.set(playerId, action);

      await safeReplyToButton(
        buttonInteraction,
        `You chose ${EMOJI[action]} **${CHOICE_LABELS[action]}**! Waiting for your opponent...`,
      );

      if (choices.has(challenger.id) && choices.has(opponent.id)) {
        collector.stop("complete");
      }
    }
    } catch (err) {
      logger.warn(
        { err, challengeId, interactionFailedRecovery: true },
        "[rps] collect handler failed",
      );
      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "declined" || reason === "cancelled") {
      return;
    }

    if (reason === "complete") {
      const challengerChoice = choices.get(challenger.id)!;
      const opponentChoice = choices.get(opponent.id)!;
      const result = getResult(challengerChoice, opponentChoice);

      let winnerId: string | null = null;
      let loserId: string | null = null;
      let resultText: string;

      if (result === "win") {
        winnerId = challenger.id;
        loserId = opponent.id;
        resultText = `🎉 **${challenger.username} wins!**`;
      } else if (result === "lose") {
        winnerId = opponent.id;
        loserId = challenger.id;
        resultText = `🎉 **${opponent.username} wins!**`;
      } else {
        resultText = `🤝 **It's a tie!**`;
      }

      try {
        recordPvpResult(winnerId, loserId, challenger.id, opponent.id);
        logger.info({ challengeId, winnerId, loserId }, "[rps] PvP complete");
      } catch (err) {
        logger.error({ err }, "[fun/rps] failed to record PvP result");
      }

      try {
        await challengeMessage.edit({
          content: [
            `⚔️ **Rock Paper Scissors Result!**`,
            ``,
            `${EMOJI[challengerChoice]} ${challenger} vs ${opponent} ${EMOJI[opponentChoice]}`,
            ``,
            resultText,
          ].join("\n"),
          components: [buildChoiceButtons(challengeId, true)],
        });
      } catch (err) {
        if (isKnownInteractionError(err)) {
          logKnownInteractionError(err, "rps.challengeMessage.edit", {
            challengeId,
          });
        } else {
          logger.warn({ err, challengeId }, "[rps] failed to edit challenge message");
        }
      }
    } else {
      const challengerChose = choices.has(challenger.id);
      const opponentChose = choices.has(opponent.id);

      let timeoutText: string;
      if (!challengerChose && !opponentChose) {
        timeoutText = "Neither player made a choice in time.";
      } else if (!challengerChose) {
        timeoutText = `${challenger} didn't make a choice in time.`;
      } else {
        timeoutText = `${opponent} didn't make a choice in time.`;
      }

      try {
        await challengeMessage.edit({
          content: `⏱️ **Challenge timed out!**\n\n${timeoutText}`,
          components: [buildChoiceButtons(challengeId, true)],
        });
        logger.warn({ challengeId }, "[rps] challenge timed out");
      } catch (err) {
        if (isKnownInteractionError(err)) {
          logKnownInteractionError(err, "rps.challengeMessage.timeout", {
            challengeId,
          });
        } else {
          logger.warn({ err, challengeId }, "[rps] failed to edit timeout message");
        }
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Stats display                                                               */
/* -------------------------------------------------------------------------- */

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const soloStats = getSoloStats(user.id);
  const pvpStats = getPvpStats(user.id);

  const lines: string[] = [];
  lines.push(`✊✋✌️ **RPS Stats for ${user}**`);
  lines.push("");
  lines.push("**vs Bot:**");
  lines.push(
    `Games: ${soloStats.total} | Wins: ${soloStats.wins} | Losses: ${soloStats.losses} | Ties: ${soloStats.ties}`,
  );
  lines.push(`Win Rate: ${soloStats.winRate}%`);
  lines.push("");
  lines.push("**vs Players:**");
  lines.push(
    `Games: ${pvpStats.total} | Wins: ${pvpStats.wins} | Losses: ${pvpStats.losses} | Ties: ${pvpStats.ties}`,
  );
  lines.push(`Win Rate: ${pvpStats.winRate}%`);

  await interaction.editReply(lines.join("\n"));
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

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
