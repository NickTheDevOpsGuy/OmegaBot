// src/commands/fun/subcommands/connect4/ui.ts
//
// Connect 4 Discord UI: board rendering and button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Cell } from "./gameLogic.js";
import { ROWS } from "./gameLogic.js";

export const EMOJI = {
  empty: "⚫",
  p1: "🔴",
  p2: "🟡",
};

export function renderBoard(board: Cell[][]): string {
  const lines: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = board[r]
      .map((c) => (c === 0 ? EMOJI.empty : c === 1 ? EMOJI.p1 : EMOJI.p2))
      .join("");
    lines.push(row);
  }
  lines.push("1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣");
  return lines.join("\n");
}

const COL_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"] as const;

export function buildControls(args: {
  gameId: string;
  board: Cell[][];
  disabled: boolean;
}): ActionRowBuilder<ButtonBuilder>[] {
  const { gameId, board, disabled } = args;

  const mk = (col: number, label: string) =>
    new ButtonBuilder()
      .setCustomId(`c4:${col}:${gameId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || board[0][col] !== 0);

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      mk(0, COL_EMOJI[0]),
      mk(1, COL_EMOJI[1]),
      mk(2, COL_EMOJI[2]),
      mk(3, COL_EMOJI[3]),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      mk(4, COL_EMOJI[4]),
      mk(5, COL_EMOJI[5]),
      mk(6, COL_EMOJI[6]),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`c4:extend:${gameId}`)
        .setLabel("Extend time")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⏱️")
        .setDisabled(disabled),
    ),
  ];
}

export function buildHeader(
  p1: { toString(): string },
  p2: { toString(): string },
  turn: 1 | 2,
): string {
  const who =
    turn === 1 ? `${EMOJI.p1} ${p1.toString()}` : `${EMOJI.p2} ${p2.toString()}`;
  return `🔴🟡 **Connect 4**\nTurn: ${who}`;
}
