// src/commands/games/fun/subcommands/connect4/sessionPersistence.ts
// Serialize/deserialize Connect 4 board + turn for persistent sessions.

import type { Cell } from "./gameLogic.js";
import { newBoard } from "./gameLogic.js";

export type Connect4State = {
  board: Cell[][];
  turn: 1 | 2;
};

export function serializeState(board: Cell[][], turn: 1 | 2): string {
  return JSON.stringify({ board, turn });
}

export function deserializeState(boardState: string): Connect4State | null {
  try {
    const raw = JSON.parse(boardState) as { board?: unknown; turn?: unknown };
    if (!raw || !Array.isArray(raw.board) || (raw.turn !== 1 && raw.turn !== 2))
      return null;
    const board = raw.board as Cell[][];
    const turn = raw.turn as 1 | 2;
    return { board, turn };
  } catch {
    return null;
  }
}

export function initialState(): Connect4State {
  return { board: newBoard(), turn: 1 };
}
