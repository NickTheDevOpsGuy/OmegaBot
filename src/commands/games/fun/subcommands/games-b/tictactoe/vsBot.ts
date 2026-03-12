// src/commands/fun/subcommands/tictactoe/vsBot.ts
// Tic-Tac-Toe vs Bot flow: single player game with message collector.

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../../../../services/discord/discord/interaction/interactionErrors.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import {
  checkWinner,
  isBoardFull,
  getBotMove,
  getWinningCells,
  type CellValue,
} from "./gameLogic.js";
import { createEmptyBoard } from "./gameLogic.js";
import { buildBoardButtons, buildExtendRow } from "./ui.js";
import { TICTACTOE_VS_BOT_TIMEOUT_MS } from "../../../../../../utils/constants.js";

export async function playVsBot(interaction: ChatInputCommandInteraction): Promise<void> {
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
        const ok = await safeMessageEdit(
          message,
          {
            content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.\n\n⏱️ *Time extended!*`,
            components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
          },
          "tictactoe.vsBot.extend",
        ).catch(() => false);
        if (!ok) {
          collector.stop("message_gone");
          await notifyGameMessageGone(buttonInteraction, "tictactoe");
        }
        return;
      }

      await buttonInteraction.deferUpdate();

      const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);

      board[row][col] = playerSymbol;

      let winner = checkWinner(board);
      if (winner === playerSymbol) {
        const winningCells = getWinningCells(board);
        collector.stop("player_win");
        const ok1 = await safeMessageEdit(
          message,
          {
            content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🎉 **You win!**`,
            components: [
              ...buildBoardButtons(gameId, board, true, winningCells),
              buildExtendRow(gameId, true),
            ],
          },
          "tictactoe.vsBot.playerWin",
        ).catch(() => false);
        if (!ok1) await notifyGameMessageGone(buttonInteraction, "tictactoe");
        return;
      }

      if (isBoardFull(board)) {
        collector.stop("tie");
        const okTie1 = await safeMessageEdit(
          message,
          {
            content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
            components: [
              ...buildBoardButtons(gameId, board, true),
              buildExtendRow(gameId, true),
            ],
          },
          "tictactoe.vsBot.tie",
        ).catch(() => false);
        if (!okTie1) await notifyGameMessageGone(buttonInteraction, "tictactoe");
        return;
      }

      const [botRow, botCol] = getBotMove(board);
      board[botRow][botCol] = botSymbol;

      winner = checkWinner(board);
      if (winner === botSymbol) {
        const winningCells = getWinningCells(board);
        collector.stop("bot_win");
        const okBot = await safeMessageEdit(
          message,
          {
            content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n😢 **Bot wins!**`,
            components: [
              ...buildBoardButtons(gameId, board, true, winningCells),
              buildExtendRow(gameId, true),
            ],
          },
          "tictactoe.vsBot.botWin",
        ).catch(() => false);
        if (!okBot) await notifyGameMessageGone(buttonInteraction, "tictactoe");
        return;
      }

      if (isBoardFull(board)) {
        collector.stop("tie");
        const okTie2 = await safeMessageEdit(
          message,
          {
            content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
            components: [
              ...buildBoardButtons(gameId, board, true),
              buildExtendRow(gameId, true),
            ],
          },
          "tictactoe.vsBot.tie2",
        ).catch(() => false);
        if (!okTie2) await notifyGameMessageGone(buttonInteraction, "tictactoe");
        return;
      }

      const okTurn = await safeMessageEdit(
        message,
        {
          content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
          components: [...buildBoardButtons(gameId, board), buildExtendRow(gameId)],
        },
        "tictactoe.vsBot.turn",
      ).catch(() => false);
      if (!okTurn) {
        collector.stop("message_gone");
        await notifyGameMessageGone(buttonInteraction, "tictactoe");
      }
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "tictactoe.vsBot.collect", { gameId });
      } else {
        logger.warn({ err, gameId }, "[tictactoe] vsBot button collect threw");
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
      ).catch(() => {});
    }
  });
}
