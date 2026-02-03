// src/commands/fun/subcommands/blackjack.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getStats, recordResult } from "./blackjackStore.js";
import { createDeck, handValue, isBlackjack, type Card } from "./blackjack/gameLogic.js";
import { buildGameMessage, buildButtons, type GameStatus } from "./blackjack/ui.js";

const GAME_TIMEOUT_MS = 120_000; // 2 minutes

/* -------------------------------------------------------------------------- */
/* Dealer turn logic                                                          */
/* -------------------------------------------------------------------------- */

async function playDealerTurn(
  buttonInteraction: ButtonInteraction,
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

  await buttonInteraction.update({
    content: buildGameMessage(playerHand, dealerHand, status, false),
    components: [buildButtons(gameId, true)],
  });
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;

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

  const playerHand: Card[] = [deck.pop()!, deck.pop()!];
  const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

  if (isBlackjack(playerHand)) {
    recordResult(interaction.user.id, "win", true);
    await interaction.editReply({
      content: buildGameMessage(playerHand, dealerHand, "blackjack", false),
      components: [],
    });
    return;
  }

  const message = await interaction.editReply({
    content: buildGameMessage(playerHand, dealerHand, "playing"),
    components: [buildButtons(gameId)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: GAME_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`bj:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const action = buttonInteraction.customId.split(":")[2];

    if (action === "hit") {
      playerHand.push(deck.pop()!);
      const playerValue = handValue(playerHand);

      if (playerValue > 21) {
        collector.stop("bust");
        recordResult(interaction.user.id, "loss");
        await buttonInteraction.update({
          content: buildGameMessage(playerHand, dealerHand, "player_bust", false),
          components: [buildButtons(gameId, true)],
        });
        return;
      }

      if (playerValue === 21) {
        collector.stop("stand");
        await playDealerTurn(
          buttonInteraction,
          playerHand,
          dealerHand,
          deck,
          gameId,
          interaction.user.id,
        );
        return;
      }

      await buttonInteraction.update({
        content: buildGameMessage(playerHand, dealerHand, "playing"),
        components: [buildButtons(gameId)],
      });
    } else if (action === "stand") {
      collector.stop("stand");
      await playDealerTurn(
        buttonInteraction,
        playerHand,
        dealerHand,
        deck,
        gameId,
        interaction.user.id,
      );
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      recordResult(interaction.user.id, "loss");
      try {
        await message.edit({
          content:
            buildGameMessage(playerHand, dealerHand, "dealer_win", false) +
            "\n\n⏱️ *Timed out*",
          components: [buildButtons(gameId, true)],
        });
      } catch (err) {
        logger.debug({ err }, "[blackjack] failed to update on timeout");
      }
    }
  });
}
