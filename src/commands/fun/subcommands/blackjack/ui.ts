// src/commands/fun/subcommands/blackjack/ui.ts
//
// Blackjack Discord UI: message formatting and button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Card } from "./gameLogic.js";
import { handValue, formatHand } from "./gameLogic.js";

export type GameStatus =
  | "playing"
  | "player_bust"
  | "dealer_bust"
  | "player_win"
  | "dealer_win"
  | "tie"
  | "blackjack";

export function buildGameMessage(
  playerHand: Card[],
  dealerHand: Card[],
  status: GameStatus,
  hideDealer = true,
): string {
  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);

  const lines = [
    "🃏 **Blackjack**",
    "",
    `**Dealer:** ${formatHand(dealerHand, hideDealer)}${!hideDealer ? ` (${dealerValue})` : ""}`,
    `**You:** ${formatHand(playerHand)} (${playerValue})`,
    "",
  ];

  switch (status) {
    case "playing":
      lines.push("**Hit** to draw, **Stand** to hold.");
      break;
    case "blackjack":
      lines.push("🎰 **BLACKJACK!** You win 3:2!");
      break;
    case "player_bust":
      lines.push("💥 **Bust!** You went over 21.");
      break;
    case "dealer_bust":
      lines.push("💥 **Dealer busts!** You win!");
      break;
    case "player_win":
      lines.push("🎉 **You win!**");
      break;
    case "dealer_win":
      lines.push("😢 **Dealer wins.**");
      break;
    case "tie":
      lines.push("🤝 **Push!** It's a tie.");
      break;
  }

  return lines.join("\n");
}

export function buildButtons(
  gameId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`bj:${gameId}:hit`)
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🃏")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`bj:${gameId}:stand`)
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✋")
      .setDisabled(disabled),
  );
}
