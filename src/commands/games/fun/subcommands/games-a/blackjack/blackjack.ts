// src/commands/fun/subcommands/blackjack/blackjack.ts
// Blackjack vs bot: hit/stand/double, cooldown, stats. Uses blackjackStore and rateLimit.
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Message,
} from "discord.js";
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
import {
  buildGameEmbed,
  buildButtons,
  buildExtendRow,
  type GameStatus,
} from "./ui.js";
import { safeMessageEdit } from "../../../../../../services/discord/discord/safeReply.js";

import { BLACKJACK_COOLDOWN_MS, GAME_TIMEOUT_MS } from "../../../../../../utils/constants.js";

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
): Promise<void> {
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

  await message.edit({
    embeds: [buildGameEmbed(playerHand, dealerHand, status, false)],
    components: [buildButtons(gameId, true), buildExtendRow(gameId, true)],
  });
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runBlackjack(interaction);
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[blackjack] handler failed");
    await interaction
      .editReply("Something went wrong with blackjack. Try again.")
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
    const achievementLine = getNewlyUnlockedAchievementLine(userId, db, () =>
      recordResult(userId, "win", true),
    );
    logger.info({ gameId, userId }, "[blackjack] blackjack");
    await interaction.editReply({
      embeds: [
        buildGameEmbed(
          playerHand,
          dealerHand,
          "blackjack",
          false,
          achievementLine ? `\n${achievementLine}` : undefined,
        ),
      ],
      components: [],
    });
    return;
  }

  const canDouble = playerHand.length === 2;
  const message = await interaction.editReply({
    embeds: [buildGameEmbed(playerHand, dealerHand, "playing")],
    components: [buildButtons(gameId, false, canDouble), buildExtendRow(gameId)],
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

      if (action === "extend") {
        collector.resetTimer();
        await buttonInteraction.deferUpdate();
        await message.edit({
          embeds: [
            buildGameEmbed(
              playerHand,
              dealerHand,
              "playing",
              true,
              "⏱️ *Time extended! You have another hour.*",
            ),
          ],
          components: [
            buildButtons(gameId, false, playerHand.length === 2),
            buildExtendRow(gameId),
          ],
        });
        return;
      }

      // Acknowledge immediately so heavy work doesn't cause "interaction failed"
      await buttonInteraction.deferUpdate();

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
        );
        return;
      }

      if (action === "hit") {
        playerHand.push(deck.pop()!);
        const playerValue = handValue(playerHand);

        if (playerValue > 21) {
          collector.stop("bust");
          recordResult(userId, "loss");
          logger.info({ gameId, userId }, "[blackjack] player bust");
          await message.edit({
            embeds: [buildGameEmbed(playerHand, dealerHand, "player_bust", false)],
            components: [buildButtons(gameId, true), buildExtendRow(gameId, true)],
          });
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
          );
          return;
        }

        await message.edit({
          embeds: [buildGameEmbed(playerHand, dealerHand, "playing")],
          components: [
            buildButtons(gameId, false, false),
            buildExtendRow(gameId),
          ],
        });
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
        );
      }
    } catch (err) {
      recordInteractionRecovery("blackjack");
      logger.warn(
        { err, gameId, interactionFailedRecovery: true },
        "[blackjack] collect handler failed",
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
              "⏱️ *You didn't play in time — round forfeited.*",
            ),
          ],
          components: [buildButtons(gameId, true), buildExtendRow(gameId, true)],
        },
        "blackjack.timeout",
      ).catch(() => {});
    }
  });
}
