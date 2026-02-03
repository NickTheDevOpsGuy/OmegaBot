// src/commands/fun/subcommands/tictactoe.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";

import {
  createEmptyBoard,
  checkWinner,
  isBoardFull,
  getBotMove,
  getWinningCells,
  type CellValue,
} from "./tictactoe/gameLogic.js";
import { buildBoardButtons } from "./tictactoe/ui.js";
import { getStats, recordResult, getH2HStats } from "./tictactoeStore.js";

const MOVE_TIMEOUT_MS = 60_000; // 60 seconds per move

function isUnknownMessageError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 10008
  );
}

async function playVsBot(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameId = `${Date.now()}-${interaction.user.id}`;
  const board = createEmptyBoard();
  const playerSymbol: CellValue = "X";
  const botSymbol: CellValue = "O";

  const message = await interaction.editReply({
    content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
    components: buildBoardButtons(gameId, board),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS * 9, // Max 9 moves
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`ttt:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    // Player move
    board[row][col] = playerSymbol;

    // Check for player win
    let winner = checkWinner(board);
    if (winner === playerSymbol) {
      const winningCells = getWinningCells(board);
      collector.stop("player_win");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🎉 **You win!**`,
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie
    if (isBoardFull(board)) {
      collector.stop("tie");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Bot move
    const [botRow, botCol] = getBotMove(board);
    board[botRow][botCol] = botSymbol;

    // Check for bot win
    winner = checkWinner(board);
    if (winner === botSymbol) {
      const winningCells = getWinningCells(board);
      collector.stop("bot_win");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n😢 **Bot wins!**`,
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie after bot move
    if (isBoardFull(board)) {
      collector.stop("tie");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Continue game
    await buttonInteraction.update({
      content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
      components: buildBoardButtons(gameId, board),
    });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      try {
        await message.edit({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n⏱️ **Game timed out!**`,
          components: buildBoardButtons(gameId, board, true),
        });
      } catch (err) {
        if (isUnknownMessageError(err)) return;
        throw err;
      }
    }
  });
}

async function playVsPlayer(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  if (opponent.id === challenger.id) {
    await interaction.editReply("You can't play against yourself!");
    return;
  }

  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Use `/fun tictactoe` without an opponent to play against me.",
    );
    return;
  }

  const gameId = `${Date.now()}-${challenger.id}-${opponent.id}`;
  const board = createEmptyBoard();

  // Randomly decide who goes first
  const xPlayer = Math.random() < 0.5 ? challenger : opponent;
  const oPlayer = xPlayer.id === challenger.id ? opponent : challenger;

  let currentPlayer = xPlayer;

  // Get head-to-head history
  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Record: ${challenger.username} ${h2h.user1Wins} - ${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const message = await interaction.editReply({
    content: [
      `🎮 **Tic Tac Toe**`,
      `❌ ${xPlayer} vs ⭕ ${oPlayer}${h2hText}`,
      ``,
      `${currentPlayer}'s turn (❌)`,
      `⏱️ 60 seconds per move`,
    ].join("\n"),
    components: buildBoardButtons(gameId, board),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`ttt:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    // Only current player can move
    if (buttonInteraction.user.id !== currentPlayer.id) {
      await buttonInteraction.reply({
        content: "It's not your turn!",
        ephemeral: true,
      });
      return;
    }

    const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    const symbol: CellValue = currentPlayer.id === xPlayer.id ? "X" : "O";
    board[row][col] = symbol;

    // Check for win
    const winner = checkWinner(board);
    if (winner) {
      const winningCells = getWinningCells(board);
      const winnerUser = winner === "X" ? xPlayer : oPlayer;
      const loserUser = winner === "X" ? oPlayer : xPlayer;

      try {
        recordResult(winnerUser.id, loserUser.id, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record result");
      }

      collector.stop("win");
      await buttonInteraction.update({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `🎉 **${winnerUser} wins!**`,
        ].join("\n"),
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie
    if (isBoardFull(board)) {
      try {
        recordResult(null, null, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record tie");
      }

      collector.stop("tie");
      await buttonInteraction.update({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `🤝 **It's a tie!**`,
        ].join("\n"),
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Switch turns
    currentPlayer = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;
    const nextSymbol = currentPlayer.id === xPlayer.id ? "❌" : "⭕";

    // Reset timeout
    collector.resetTimer();

    await buttonInteraction.update({
      content: [
        `🎮 **Tic Tac Toe**`,
        `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
        ``,
        `${currentPlayer}'s turn (${nextSymbol})`,
        `⏱️ 60 seconds per move`,
      ].join("\n"),
      components: buildBoardButtons(gameId, board),
    });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const timeoutLoser = currentPlayer;
      const timeoutWinner = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;

      try {
        recordResult(timeoutWinner.id, timeoutLoser.id, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record timeout result");
      }

      try {
        await message.edit({
          content: [
            `🎮 **Tic Tac Toe**`,
            `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
            ``,
            `⏱️ **${timeoutLoser} ran out of time!**`,
            `🎉 **${timeoutWinner} wins by timeout!**`,
          ].join("\n"),
          components: buildBoardButtons(gameId, board, true),
        });
      } catch (err) {
        if (isUnknownMessageError(err)) return;
        throw err;
      }
    }
  });
}

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const stats = getStats(user.id);

  const lines = [
    `🎮 **Tic Tac Toe Stats for ${user}**`,
    "",
    `📊 **Overall**`,
    `Games: ${stats.total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
    `Win Rate: ${stats.winRate}%`,
  ];

  await interaction.editReply(lines.join("\n"));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("opponent");

  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (opponent) {
    await playVsPlayer(interaction, opponent);
  } else {
    await playVsBot(interaction);
  }
}
