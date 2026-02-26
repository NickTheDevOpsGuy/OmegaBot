// src/commands/fun/subcommands/blackjack.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Message,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../services/metrics/server.js";
import {
  checkBlackjackCooldown,
  formatCooldownMessage,
  recordBlackjackGame,
} from "../../../services/discord/rateLimit.js";
import { getStats, recordResult } from "./blackjackStore.js";
import { createDeck, handValue, isBlackjack, type Card } from "./blackjack/gameLogic.js";
import {
  buildGameMessage,
  buildButtons,
  buildExtendRow,
  type GameStatus,
} from "./blackjack/ui.js";
import { safeMessageEdit } from "../../../services/discord/safeReply.js";

import { BLACKJACK_COOLDOWN_MS, GAME_TIMEOUT_MS } from "../../../constants.js";

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
    content: buildGameMessage(playerHand, dealerHand, status, false),
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
    recordResult(userId, "win", true);
    logger.info({ gameId, userId }, "[blackjack] blackjack");
    await interaction.editReply({
      content: buildGameMessage(playerHand, dealerHand, "blackjack", false),
      components: [],
    });
    return;
  }

  const message = await interaction.editReply({
    content: buildGameMessage(playerHand, dealerHand, "playing"),
    components: [buildButtons(gameId), buildExtendRow(gameId)],
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
          content:
            buildGameMessage(playerHand, dealerHand, "playing") +
            "\n\n⏱️ *Time extended! You have another hour.*",
          components: [buildButtons(gameId), buildExtendRow(gameId)],
        });
        return;
      }

      // Acknowledge immediately so heavy work doesn't cause "interaction failed"
      await buttonInteraction.deferUpdate();

      if (action === "hit") {
        playerHand.push(deck.pop()!);
        const playerValue = handValue(playerHand);

        if (playerValue > 21) {
          collector.stop("bust");
          recordResult(userId, "loss");
          logger.info({ gameId, userId }, "[blackjack] player bust");
          await message.edit({
            content: buildGameMessage(playerHand, dealerHand, "player_bust", false),
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
          content: buildGameMessage(playerHand, dealerHand, "playing"),
          components: [buildButtons(gameId), buildExtendRow(gameId)],
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
          content:
            buildGameMessage(playerHand, dealerHand, "dealer_win", false) +
            "\n\n⏱️ *Timed out*",
          components: [buildButtons(gameId, true), buildExtendRow(gameId, true)],
        },
        "blackjack.timeout",
      ).catch(() => {});
    }
  });
}
