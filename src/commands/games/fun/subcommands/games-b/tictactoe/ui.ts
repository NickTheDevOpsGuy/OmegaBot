// src/commands/fun/subcommands/tictactoe/ui.ts
// Discord UI components for Tic-Tac-Toe

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Board, CellValue } from "./gameLogic.js";

export const CELL_EMOJI: Record<CellValue, string> = {
  "": "⬜",
  X: "❌",
  O: "⭕",
};

export function buildBoardButtons(
  gameId: string,
  board: Board,
  disabled = false,
  winningCells: [number, number][] = [],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (let c = 0; c < 3; c++) {
      const cell = board[r][c];
      const isWinningCell = winningCells.some(([wr, wc]) => wr === r && wc === c);

      let style = ButtonStyle.Secondary;
      if (cell === "X") style = ButtonStyle.Primary;
      else if (cell === "O") style = ButtonStyle.Danger;
      if (isWinningCell) style = ButtonStyle.Success;

      const emoji = CELL_EMOJI[cell];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${gameId}:${r}:${c}`)
          .setLabel("\u200B")
          .setEmoji(emoji)
          .setStyle(style)
          .setDisabled(disabled || cell !== ""),
      );
    }

    rows.push(row);
  }

  return rows;
}

export function buildExtendRow(
  gameId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ttt:${gameId}:extend`)
      .setLabel("Extend time")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏱️")
      .setDisabled(disabled),
  );
}
