// src/commands/fun/subcommands/tictactoe.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../services/discord/interactionErrors.js";
import {
  safeReplyToButton,
  safeMessageEdit,
} from "../../../services/discord/safeReply.js";

import {
  createEmptyBoard,
  checkWinner,
  isBoardFull,
  getBotMove,
  getWinningCells,
  type CellValue,
} from "./tictactoe/gameLogic.js";
import { buildBoardButtons, buildExtendRow } from "./tictactoe/ui.js";
import { getStats, recordResult, getH2HStats } from "./tictactoeStore.js";

import {
  MOVE_TIMEOUT_MS,
  WARNING_BEFORE_MS,
  TICTACTOE_VS_BOT_TIMEOUT_MS,
} from "../../../constants.js";

async function playVsBot(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameId = `${Date.now()}-${interaction.user.id}`;
  const board = createEmptyBoard();
  const playerSymbol: CellValue = "X";
  const botSymbol: CellValue = "O";

  logger.info({ gameId, userId: interaction.user.id }, "[tictactoe] vsBot started");

  const message = await interaction.editReply({
    content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
    components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: TICTACTOE_VS_BOT_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`ttt:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    try {
      const action = buttonInteraction.customId.split(":")[2];
      if (action === "extend") {
        collector.resetTimer();
        await buttonInteraction.deferUpdate();
        await message.edit({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.\n\n⏱️ *Time extended!*`,
          components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
        });
        return;
      }

      const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);

      board[row][col] = playerSymbol;

      let winner = checkWinner(board);
      if (winner === playerSymbol) {
        const winningCells = getWinningCells(board);
        collector.stop("player_win");
        await buttonInteraction.update({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🎉 **You win!**`,
          components: [
            ...buildBoardButtons(gameId, board, true, winningCells),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

      if (isBoardFull(board)) {
        collector.stop("tie");
        await buttonInteraction.update({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
          components: [
            ...buildBoardButtons(gameId, board, true),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

      const [botRow, botCol] = getBotMove(board);
      board[botRow][botCol] = botSymbol;

      winner = checkWinner(board);
      if (winner === botSymbol) {
        const winningCells = getWinningCells(board);
        collector.stop("bot_win");
        await buttonInteraction.update({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n😢 **Bot wins!**`,
          components: [
            ...buildBoardButtons(gameId, board, true, winningCells),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

      if (isBoardFull(board)) {
        collector.stop("tie");
        await buttonInteraction.update({
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
          components: [
            ...buildBoardButtons(gameId, board, true),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
        components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
      });
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "tictactoe.vsBot.collect", { gameId });
      } else {
        logger.warn({ err, gameId }, "[tictactoe] vsBot collect failed");
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      logger.warn({ gameId, userId: interaction.user.id }, "[tictactoe] vsBot timed out");
      await safeMessageEdit(
        message,
        {
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n⏱️ **Game timed out!**`,
          components: [
            ...buildBoardButtons(gameId, board, true),
            buildExtendRow(gameId, true),
          ],
        },
        "tictactoe.vsBot.timeout",
      );
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

  logger.info(
    { gameId, challengerId: challenger.id, opponentId: opponent.id },
    "[tictactoe] vsPlayer started",
  );

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
      `⏱️ 10 min per move (starter can extend)`,
    ].join("\n"),
    components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`ttt:${gameId}:`),
  });

  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleWarning = () => {
    if (warningTimer) clearTimeout(warningTimer);
    warningTimer = setTimeout(() => {
      const nextSymbol = currentPlayer.id === xPlayer.id ? "❌" : "⭕";
      void safeMessageEdit(
        message,
        {
          content: [
            `🎮 **Tic Tac Toe**`,
            `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
            ``,
            `⏱️ **1 minute left!** ${currentPlayer}'s turn (${nextSymbol})`,
            `⏱️ 10 min per move (starter can extend)`,
          ].join("\n"),
          components: buildBoardButtons(gameId, board),
        },
        "tictactoe.warning",
      );
    }, MOVE_TIMEOUT_MS - WARNING_BEFORE_MS);
  };
  scheduleWarning();

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    try {
      const action = buttonInteraction.customId.split(":")[2];
      if (action === "extend") {
        if (buttonInteraction.user.id !== challenger.id) {
          await safeReplyToButton(
            buttonInteraction,
            "Only the person who started the game can extend time.",
          );
          return;
        }
        collector.resetTimer();
        scheduleWarning();
        await buttonInteraction.deferUpdate();
        await safeMessageEdit(
          message,
          {
            content: [
              `🎮 **Tic Tac Toe**`,
              `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
              ``,
              `${currentPlayer}'s turn (${currentPlayer.id === xPlayer.id ? "❌" : "⭕"})`,
              `⏱️ **Time extended!** +10 min for this move.`,
            ].join("\n"),
            components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
          },
          "tictactoe.extend",
        );
        return;
      }

      if (buttonInteraction.user.id !== currentPlayer.id) {
        await safeReplyToButton(buttonInteraction, "It's not your turn!");
        return;
      }

      const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);

      const symbol: CellValue = currentPlayer.id === xPlayer.id ? "X" : "O";
      board[row][col] = symbol;

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
          components: [
            ...buildBoardButtons(gameId, board, true, winningCells),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

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
          components: [
            ...buildBoardButtons(gameId, board, true),
            buildExtendRow(gameId, true),
          ],
        });
        return;
      }

      currentPlayer = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;
      const nextSymbol = currentPlayer.id === xPlayer.id ? "❌" : "⭕";

      collector.resetTimer();
      scheduleWarning();

      await buttonInteraction.update({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `${currentPlayer}'s turn (${nextSymbol})`,
          `⏱️ 10 min per move (starter can extend)`,
        ].join("\n"),
        components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
      });
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "tictactoe.vsPlayer.collect", { gameId });
      } else {
        logger.warn({ err, gameId }, "[tictactoe] vsPlayer collect failed");
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (warningTimer) clearTimeout(warningTimer);
    if (reason === "time") {
      logger.warn(
        { gameId, timeoutLoserId: currentPlayer.id },
        "[tictactoe] vsPlayer timed out",
      );
      const timeoutLoser = currentPlayer;
      const timeoutWinner = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;

      try {
        recordResult(timeoutWinner.id, timeoutLoser.id, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record timeout result");
      }

      await safeMessageEdit(
        message,
        {
          content: [
            `🎮 **Tic Tac Toe**`,
            `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
            ``,
            `⏱️ **${timeoutLoser} ran out of time!**`,
            `🎉 **${timeoutWinner} wins by timeout!**`,
          ].join("\n"),
          components: [
            ...buildBoardButtons(gameId, board, true),
            buildExtendRow(gameId, true),
          ],
        },
        "tictactoe.vsPlayer.timeout",
      );
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
