// src/commands/fun/subcommands/tictactoe/vsPlayer.ts
// Tic-Tac-Toe PvP flow: challenge, collector, turn-based moves.

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../../../../services/discord/discord/interaction/interactionErrors.js";
import {
  safeReplyToButton,
  safeMessageEdit,
} from "../../../../../../services/discord/discord/safeReply.js";
import {
  createEmptyBoard,
  checkWinner,
  isBoardFull,
  getWinningCells,
  type CellValue,
} from "./gameLogic.js";
import { buildBoardButtons, buildExtendRow } from "./ui.js";
import { recordResult, getH2HStats } from "./tictactoeStore.js";
import { MOVE_TIMEOUT_MS, WARNING_BEFORE_MS } from "../../../../../../utils/constants.js";

export async function playVsPlayer(
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

  const xPlayer = Math.random() < 0.5 ? challenger : opponent;
  const oPlayer = xPlayer.id === challenger.id ? opponent : challenger;

  let currentPlayer = xPlayer;

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
      `⏱️ 30 min per move (starter can extend)`,
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
            `⏱️ 30 min per move (starter can extend)`,
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
              `⏱️ **Time extended!** +30 min for this move.`,
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

      await buttonInteraction.deferUpdate();

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
        await safeMessageEdit(
          message,
          {
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
          },
          "tictactoe.vsPlayer.win",
        );
        return;
      }

      if (isBoardFull(board)) {
        try {
          recordResult(null, null, challenger.id, opponent.id);
        } catch (err) {
          logger.error({ err }, "[fun/tictactoe] failed to record tie");
        }

        collector.stop("tie");
        await safeMessageEdit(
          message,
          {
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
          },
          "tictactoe.vsPlayer.tie",
        );
        return;
      }

      currentPlayer = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;
      const nextSymbol = currentPlayer.id === xPlayer.id ? "❌" : "⭕";

      collector.resetTimer();
      scheduleWarning();

      await safeMessageEdit(
        message,
        {
          content: [
            `🎮 **Tic Tac Toe**`,
            `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
            ``,
            `${currentPlayer}'s turn (${nextSymbol})`,
            `⏱️ 30 min per move (starter can extend)`,
          ].join("\n"),
          components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
        },
        "tictactoe.vsPlayer.turn",
      );
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
      ).catch(() => {});
    }
  });
}
