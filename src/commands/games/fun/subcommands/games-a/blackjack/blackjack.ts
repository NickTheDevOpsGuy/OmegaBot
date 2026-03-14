// src/commands/fun/subcommands/blackjack/blackjack.ts
// Blackjack vs bot: hit/stand/double, cooldown, stats. Uses blackjackStore and rateLimit.
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Message,
} from "discord.js";
import { errMessage, getUserFacingReason } from "../../../../../../utils/errors.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import {
  checkBlackjackCooldown,
  formatCooldownMessage,
  recordBlackjackGame,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { getStats, recordResult } from "./blackjackStore.js";
import { createDeck, handValue, isBlackjack, type Card } from "./gameLogic.js";
import { buildGameEmbed, buildButtons, type GameStatus } from "./ui.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import { buildMilestoneLine } from "../../shared/gameFeedback.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

import {
  BLACKJACK_COOLDOWN_MS,
  GAME_TIMEOUT_MS,
} from "../../../../../../utils/constants.js";

/* -------------------------------------------------------------------------- */
/* Dealer turn logic                                                          */
/* -------------------------------------------------------------------------- */

async function playDealerTurn(
  _interaction: ChatInputCommandInteraction,
  message: Message,
  playerHand: Card[],
  dealerHand: Card[],
  deck: Card[],
  gameId: string,
  userId: string,
  buttonInteraction?: ButtonInteraction,
): Promise<void> {
  const statsBefore = getStats(userId);
  while (handValue(dealerHand) < 17) {
    dealerHand.push(deck.pop()!);
  }

  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);

  let status: GameStatus;
  let result: "win" | "loss" | "tie";

  if (dealerValue > 21) {
    status = "dealer_bust";
    result = "win";
  } else if (playerValue > dealerValue) {
    status = "player_win";
    result = "win";
  } else if (dealerValue > playerValue) {
    status = "dealer_win";
    result = "loss";
  } else {
    status = "tie";
    result = "tie";
  }

  recordResult(userId, result);
  logger.info({ gameId, userId, result }, "[blackjack] game ended");
  const statsAfter = getStats(userId);
  const xpResult = awardXp(userId, result === "win" ? 18 : result === "tie" ? 10 : 6);
  const extraLines = [
    result === "win"
      ? buildMilestoneLine(
          statsBefore.wins,
          statsAfter.wins,
          [1, 5, 10, 25],
          "blackjack wins",
        )
      : undefined,
    xpResult.leveledUp
      ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
      : `✨ +${xpResult.amount} XP`,
    "See your stats: /fun blackjack stats",
  ]
    .filter(Boolean)
    .join("\n");

  const ok = await safeMessageEdit(
    message,
    {
      embeds: [buildGameEmbed(playerHand, dealerHand, status, false, extraLines)],
      components: [buildButtons(gameId, true)],
    },
    "blackjack.playDealerTurn",
    buttonInteraction ?? _interaction,
  ).catch(() => false);
  if (!ok && buttonInteraction) {
    await notifyGameMessageGone(buttonInteraction, "blackjack").catch(() => {});
  }
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runBlackjack(interaction);
  } catch (err) {
    logger.error(
      { err, userId: interaction.user.id },
      `[blackjack] game handler threw: ${errMessage(err)}`,
    );
    await interaction
      .editReply(`❌ Blackjack couldn't complete: ${getUserFacingReason(err)}`)
      .catch(() => {});
  }
}

async function runBlackjack(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;

  if (!showStatsFlag) {
    const remaining = checkBlackjackCooldown(interaction.user.id);
    if (remaining > 0) {
      await interaction.editReply(
        formatCooldownMessage(
          remaining,
          BLACKJACK_COOLDOWN_MS / 1000,
          "blackjack",
          interaction.guild?.preferredLocale ?? null,
        ),
      );
      return;
    }
  }

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const total = stats.wins + stats.losses + stats.ties;

    await interaction.editReply(
      [
        `🃏 **Blackjack Stats for ${interaction.user}**`,
        "",
        `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
        `Win Rate: ${stats.winRate}%`,
        `🎰 Blackjacks: ${stats.blackjacks}`,
      ].join("\n"),
    );
    return;
  }

  const deck = createDeck();
  const gameId = `${Date.now()}-${interaction.user.id}`;
  const userId = interaction.user.id;

  recordBlackjackGame(userId);
  logger.info({ gameId, userId }, "[blackjack] game started");

  const playerHand: Card[] = [deck.pop()!, deck.pop()!];
  const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

  if (isBlackjack(playerHand)) {
    const db = getDb();
    const statsBefore = getStats(userId);
    let xpLine: string | undefined;
    const achievementLine = getNewlyUnlockedAchievementLine(userId, db, () => {
      recordResult(userId, "win", true);
      const xpResult = awardXp(userId, 28);
      xpLine = xpResult.leveledUp
        ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
        : `✨ +${xpResult.amount} XP`;
    });
    const statsAfter = getStats(userId);
    const extraLines = [
      buildMilestoneLine(
        statsBefore.wins,
        statsAfter.wins,
        [1, 5, 10, 25],
        "blackjack wins",
      ),
      xpLine,
      "See your stats: /fun blackjack stats",
      achievementLine,
    ]
      .filter(Boolean)
      .join("\n");
    logger.info({ gameId, userId }, "[blackjack] blackjack");
    await interaction.editReply({
      embeds: [buildGameEmbed(playerHand, dealerHand, "blackjack", false, extraLines)],
      components: [],
    });
    return;
  }

  const canDouble = playerHand.length === 2;
  const message = await interaction.editReply({
    embeds: [buildGameEmbed(playerHand, dealerHand, "playing")],
    components: [buildButtons(gameId, false, canDouble)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: GAME_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`bj:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    try {
      const action = buttonInteraction.customId.split(":")[2];

      // Acknowledge immediately so heavy work doesn't cause "interaction failed"
      await buttonInteraction.deferUpdate();

      if (action !== "hit" && action !== "stand" && action !== "double") {
        return;
      }

      if (action === "double") {
        playerHand.push(deck.pop()!);
        collector.stop("stand");
        await playDealerTurn(
          interaction,
          message,
          playerHand,
          dealerHand,
          deck,
          gameId,
          userId,
          buttonInteraction,
        );
        return;
      }

      if (action === "hit") {
        playerHand.push(deck.pop()!);
        const playerValue = handValue(playerHand);

        if (playerValue > 21) {
          collector.stop("bust");
          const statsBefore = getStats(userId);
          recordResult(userId, "loss");
          const xpResult = awardXp(userId, 6);
          logger.info({ gameId, userId }, "[blackjack] player bust");
          const ok = await safeMessageEdit(
            message,
            {
              embeds: [
                buildGameEmbed(
                  playerHand,
                  dealerHand,
                  "player_bust",
                  false,
                  [
                    xpResult.leveledUp
                      ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
                      : `✨ +${xpResult.amount} XP`,
                    statsBefore.wins > 0
                      ? "See your stats: /fun blackjack stats"
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                ),
              ],
              components: [buildButtons(gameId, true)],
            },
            "blackjack.bust",
            buttonInteraction,
          ).catch(() => false);
          if (!ok) {
            await notifyGameMessageGone(buttonInteraction, "blackjack");
          }
          return;
        }

        if (playerValue === 21) {
          collector.stop("stand");
          await playDealerTurn(
            interaction,
            message,
            playerHand,
            dealerHand,
            deck,
            gameId,
            userId,
            buttonInteraction,
          );
          return;
        }

        const ok = await safeMessageEdit(
          message,
          {
            embeds: [buildGameEmbed(playerHand, dealerHand, "playing")],
            components: [buildButtons(gameId, false, false)],
          },
          "blackjack.hit",
          buttonInteraction,
        ).catch(() => false);
        if (!ok) {
          collector.stop("message_gone");
          await notifyGameMessageGone(buttonInteraction, "blackjack");
        }
      } else if (action === "stand") {
        collector.stop("stand");
        await playDealerTurn(
          interaction,
          message,
          playerHand,
          dealerHand,
          deck,
          gameId,
          userId,
          buttonInteraction,
        );
      }
    } catch (err) {
      recordInteractionRecovery("blackjack");
      logger.warn(
        { err, gameId, interactionFailedRecovery: true },
        "[blackjack] game button collect threw",
      );
      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      recordResult(userId, "loss");
      logger.warn({ gameId, userId }, "[blackjack] timed out");
      await safeMessageEdit(
        message,
        {
          embeds: [
            buildGameEmbed(
              playerHand,
              dealerHand,
              "dealer_win",
              false,
              "⏱️ *You didn't play in time — round forfeited.*\nSee your stats: /fun blackjack stats",
            ),
          ],
          components: [buildButtons(gameId, true)],
        },
        "blackjack.timeout",
        interaction,
      ).catch(() => {});
    }
  });
}
