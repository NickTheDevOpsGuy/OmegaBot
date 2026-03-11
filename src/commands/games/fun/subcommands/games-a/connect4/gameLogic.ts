// src/commands/fun/subcommands/connect4/gameLogic.ts
//
// Connect 4 game logic.

export type Cell = 0 | 1 | 2; // 0 empty, 1 p1 (red), 2 p2 (yellow)

export const ROWS = 6;
export const COLS = 7;

export function newBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0 as Cell),
  );
}

export function drop(
  board: Cell[][],
  col: number,
  who: Cell,
): { ok: boolean; row?: number } {
  if (col < 0 || col >= COLS) return { ok: false };
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = who;
      return { ok: true, row: r };
    }
  }
  return { ok: false };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function has4(board: Cell[][], who: Cell): boolean {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== who) continue;

      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (!inBounds(rr, cc) || board[rr][cc] !== who) break;
          n++;
        }
        if (n >= 4) return true;
      }
    }
  }
  return false;
}

export function full(board: Cell[][]): boolean {
  return board[0].every((c) => c !== 0);
}
