// src/commands/fun/subcommands/blackjack/ui.ts
//
// Blackjack Discord UI: message formatting, embed, and button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
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

/** Embed colors by outcome (Discord hex). */
const EMBED_COLORS = {
  playing: 0x3b82f6, // blue
  blackjack: 0x22c55e, // green
  player_win: 0x22c55e,
  dealer_bust: 0x22c55e,
  player_bust: 0xef4444, // red
  dealer_win: 0xef4444,
  tie: 0x94a3b8, // slate
} as const;

function getStatusLine(status: GameStatus): string {
  switch (status) {
    case "playing":
      return "**Hit** to draw, **Stand** to hold, **Double** to double down (one card, then stand).";
    case "blackjack":
      return "🎰 **BLACKJACK!** You win 3:2!";
    case "player_bust":
      return "💥 **Bust!** You went over 21.";
    case "dealer_bust":
      return "💥 **Dealer busts!** You win!";
    case "player_win":
      return "🎉 **You win!**";
    case "dealer_win":
      return "😢 **Dealer wins.**";
    case "tie":
      return "🤝 **Push** — it's a tie.";
    default:
      return "";
  }
}

export function buildGameEmbed(
  playerHand: Card[],
  dealerHand: Card[],
  status: GameStatus,
  hideDealer = true,
  extraLine?: string,
): EmbedBuilder {
  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);
  const dealerStr = `${formatHand(dealerHand, hideDealer)}${!hideDealer ? ` → **${dealerValue}**` : ""}`;
  const youStr = `${formatHand(playerHand)} → **${playerValue}**`;

  const desc = [
    "**Dealer**",
    `└ ${dealerStr}`,
    "",
    "**You**",
    `└ ${youStr}`,
    "",
    getStatusLine(status),
    extraLine ? `\n${extraLine}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("🃏 Blackjack")
    .setDescription(desc)
    .setColor(EMBED_COLORS[status]);
}

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
  canDouble = false,
): ActionRowBuilder<ButtonBuilder> {
  const components = [
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
  ];
  if (canDouble) {
    components.push(
      new ButtonBuilder()
        .setCustomId(`bj:${gameId}:double`)
        .setLabel("Double")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("💰")
        .setDisabled(disabled),
    );
  }
  return new ActionRowBuilder<ButtonBuilder>().addComponents(...components);
}

export function buildExtendRow(
  gameId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`bj:${gameId}:extend`)
      .setLabel("Extend time")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏱️")
      .setDisabled(disabled),
  );
}
