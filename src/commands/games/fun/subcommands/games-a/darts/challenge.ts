// src/commands/fun/subcommands/darts/challenge.ts
// PvP darts challenge: challenger throws first, opponent has time to throw.

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { DARTS_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { CHALLENGE_TIMEOUT_MS } from "../../../../../../utils/constants.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import { safeReplyToButton } from "../../../../../../services/discord/discord/safeReply.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../../../../services/discord/discord/interaction/interactionErrors.js";
import {
  checkDartsCooldown,
  formatCooldownMessage,
  recordDartsThrow,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { recordSoloThrow, recordPvpResult, getH2HStats } from "./dartsStore.js";
import { DARTBOARD_ART, doThrow, formatThrowLines } from "./gameLogic.js";
import { buildThrowButton, buildDeclineButton, buildExtendButton } from "./ui.js";

export async function handleChallenge(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  if (opponent.id === challenger.id) {
    await interaction.editReply(
      "You can't challenge yourself! Try `/fun darts` to throw solo.",
    );
    return;
  }

  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Try `/fun darts` to throw solo.",
    );
    return;
  }

  const remaining = checkDartsCooldown(challenger.id);
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

  const challengeId = `${Date.now()}-${challenger.id}`;

  const { hits, score, is180 } = doThrow();
  recordDartsThrow(challenger.id);
  recordSoloThrow(challenger.id, score, is180);

  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Head-to-head: ${challenger.username} ${h2h.user1Wins}–${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const challengerLines = formatThrowLines(hits, score, `${challenger.username}'s throw`);

  const challengeMessage = await interaction.editReply({
    content: [
      `🎯 **Darts Challenge!**`,
      ``,
      `${challenger} challenges ${opponent}!`,
      h2hText,
      ``,
      DARTBOARD_ART,
      ``,
      ...challengerLines,
      ``,
      `${opponent} – click **Throw my darts** to take your turn!`,
      `⏱️ You have 24 hours (starter can extend)`,
    ].join("\n"),
    components: [
      buildThrowButton(challengeId),
      buildDeclineButton(challengeId),
      buildExtendButton(challengeId),
    ],
  });

  const challengerScore = score;
  const challengerHits = hits;
  const allowedOpponent = opponent.id;

  const collector = challengeMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CHALLENGE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`darts:${challengeId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    try {
      const playerId = buttonInteraction.user.id;
      const action = buttonInteraction.customId.split(":")[2] as
        | "throw"
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
        const content = [
          `🎯 **Darts Challenge!**`,
          ``,
          `${challenger} challenges ${opponent}!`,
          h2hText,
          ``,
          DARTBOARD_ART,
          ``,
          ...formatThrowLines(
            challengerHits,
            challengerScore,
            `${challenger.username}'s throw`,
          ),
          ``,
          `${opponent} – click **Throw my darts** to take your turn!`,
          `⏱️ **Time extended!** You have another 24 hours.`,
        ].join("\n");
        await challengeMessage.edit({
          content,
          components: [
            buildThrowButton(challengeId),
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
            content: `❌ ${opponent} declined the darts challenge.`,
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

      if (action === "throw" && playerId === allowedOpponent) {
        const remainingOpp = checkDartsCooldown(opponent.id);
        if (remainingOpp > 0) {
          await safeReplyToButton(
            buttonInteraction,
            formatCooldownMessage(
              remainingOpp,
              DARTS_COOLDOWN_MS / 1000,
              "darts",
              buttonInteraction.guild?.preferredLocale ?? null,
            ),
          );
          return;
        }

        await buttonInteraction.deferUpdate();

        const { hits: oppHits, score: oppScore, is180: opp180 } = doThrow();
        recordDartsThrow(opponent.id);
        recordSoloThrow(opponent.id, oppScore, opp180);

        let winnerId: string | null = null;
        let loserId: string | null = null;
        let resultText: string;

        if (oppScore > challengerScore) {
          winnerId = opponent.id;
          loserId = challenger.id;
          resultText = `🎉 **${opponent.username} wins!** ${oppScore}–${challengerScore}`;
        } else if (oppScore < challengerScore) {
          winnerId = challenger.id;
          loserId = opponent.id;
          resultText = `🎉 **${challenger.username} wins!** ${challengerScore}–${oppScore}`;
        } else {
          resultText = `🤝 **It's a tie!** ${challengerScore}–${oppScore}`;
        }

        recordPvpResult(winnerId, loserId, challenger.id, opponent.id);
        logger.info(
          { challengeId, challengerScore, oppScore, winnerId },
          "[darts] PvP complete",
        );

        const oppLines = formatThrowLines(
          oppHits,
          oppScore,
          `${opponent.username}'s throw`,
        );

        try {
          await challengeMessage.edit({
            content: [
              `🎯 **Darts Result!**`,
              ``,
              `${challenger} **${challengerScore}** vs **${oppScore}** ${opponent}`,
              ``,
              ...formatThrowLines(
                challengerHits,
                challengerScore,
                `${challenger.username}`,
              ),
              ``,
              ...oppLines,
              ``,
              resultText,
            ].join("\n"),
            components: [buildThrowButton(challengeId, true)],
          });
        } catch (err) {
          if (isKnownInteractionError(err)) {
            logKnownInteractionError(err, "darts.challengeResult", { challengeId });
          } else {
            logger.warn({ err, challengeId }, "[darts] failed to edit challenge result");
          }
        }
        collector.stop("complete");
      } else if (action === "throw") {
        await safeReplyToButton(
          buttonInteraction,
          "Only the challenged player can throw here!",
        );
      }
    } catch (err) {
      recordInteractionRecovery("darts");
      logger.warn(
        { err, challengeId, interactionFailedRecovery: true },
        "[darts] collect handler failed",
      );
      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "complete" || reason === "declined" || reason === "cancelled") {
      return;
    }

    try {
      const timeoutText = `${opponent} didn't throw in time.`;
      await challengeMessage.edit({
        content: `⏱️ **Challenge timed out!**\n\n${timeoutText}`,
        components: [buildThrowButton(challengeId, true)],
      });
      logger.warn({ challengeId }, "[darts] challenge timed out");
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "darts.challengeTimeout", { challengeId });
      } else {
        logger.warn({ err, challengeId }, "[darts] failed to edit timeout message");
      }
    }
  });
}
