// src/commands/fun/subcommands/blackjack.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

type Card = { suit: (typeof SUITS)[number]; rank: (typeof RANKS)[number] };

const GAME_TIMEOUT_MS = 120_000; // 2 minutes

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureBlackjackTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      blackjacks INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

type BlackjackStats = {
  wins: number;
  losses: number;
  ties: number;
  blackjacks: number;
  winRate: number;
};

function getStats(userId: string): BlackjackStats {
  ensureBlackjackTable();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number; blackjacks: number };
  const row = db
    .prepare(
      `SELECT wins, losses, ties, blackjacks FROM blackjack_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, ties: 0, blackjacks: 0, winRate: 0 };

  const total = row.wins + row.losses + row.ties;
  return {
    ...row,
    winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
  };
}

function recordResult(
  userId: string,
  result: "win" | "loss" | "tie",
  isBlackjack = false,
): void {
  ensureBlackjackTable();
  const db = getDb();
  const now = Date.now();

  const winInc = result === "win" ? 1 : 0;
  const lossInc = result === "loss" ? 1 : 0;
  const tieInc = result === "tie" ? 1 : 0;
  const bjInc = isBlackjack ? 1 : 0;

  db.prepare(
    `INSERT INTO blackjack_stats (user_id, wins, losses, ties, blackjacks, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       wins = wins + ?,
       losses = losses + ?,
       ties = ties + ?,
       blackjacks = blackjacks + ?,
       updated_at = ?`,
  ).run(userId, winInc, lossInc, tieInc, bjInc, now, winInc, lossInc, tieInc, bjInc, now);
}

/* -------------------------------------------------------------------------- */
/* Game Logic                                                                  */
/* -------------------------------------------------------------------------- */

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Shuffle using Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card: Card): number {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += cardValue(card);
    }
  }

  // Convert aces from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function formatCard(card: Card): string {
  return `\`${card.rank}${card.suit}\``;
}

function formatHand(hand: Card[], hideSecond = false): string {
  if (hideSecond && hand.length >= 2) {
    return `${formatCard(hand[0])} \`??\``;
  }
  return hand.map(formatCard).join(" ");
}

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

/* -------------------------------------------------------------------------- */
/* UI                                                                          */
/* -------------------------------------------------------------------------- */

type GameStatus =
  | "playing"
  | "player_bust"
  | "dealer_bust"
  | "player_win"
  | "dealer_win"
  | "tie"
  | "blackjack";

function buildGameMessage(
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

function buildButtons(gameId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
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

  // Start a new game
  const deck = createDeck();
  const gameId = `${Date.now()}-${interaction.user.id}`;

  const playerHand: Card[] = [deck.pop()!, deck.pop()!];
  const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

  // Check for immediate blackjack
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
        // Auto-stand on 21
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

async function playDealerTurn(
  buttonInteraction: ButtonInteraction,
  playerHand: Card[],
  dealerHand: Card[],
  deck: Card[],
  gameId: string,
  userId: string,
): Promise<void> {
  // Dealer draws until 17+
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
