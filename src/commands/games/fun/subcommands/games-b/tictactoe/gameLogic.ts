// src/commands/fun/subcommands/tictactoe/gameLogic.ts
// Pure Tic-Tac-Toe game logic (no Discord)

export type CellValue = "" | "X" | "O";
export type Board = [
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue],
];

export function createEmptyBoard(): Board {
  return [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
}

export function checkWinner(board: Board): CellValue {
  // Rows
  for (let r = 0; r < 3; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return board[r][0];
    }
  }

  // Columns
  for (let c = 0; c < 3; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return board[0][c];
    }
  }

  // Diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }

  return "";
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== ""));
}

export function getWinningCells(board: Board): [number, number][] {
  // Rows
  for (let r = 0; r < 3; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return [
        [r, 0],
        [r, 1],
        [r, 2],
      ];
    }
  }

  // Columns
  for (let c = 0; c < 3; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return [
        [0, c],
        [1, c],
        [2, c],
      ];
    }
  }

  // Diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return [
      [0, 2],
      [1, 1],
      [2, 0],
    ];
  }

  return [];
}

export function getBotMove(board: Board): [number, number] {
  // Simple AI: try to win, then block, then center, then corners, then random

  // Check for winning move
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === "") {
        board[r][c] = "O";
        if (checkWinner(board) === "O") {
          board[r][c] = "";
          return [r, c];
        }
        board[r][c] = "";
      }
    }
  }

  // Block player's winning move
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === "") {
        board[r][c] = "X";
        if (checkWinner(board) === "X") {
          board[r][c] = "";
          return [r, c];
        }
        board[r][c] = "";
      }
    }
  }

  // Take center
  if (board[1][1] === "") return [1, 1];

  // Take corners
  const corners: [number, number][] = [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ];
  const emptyCorners = corners.filter(([r, c]) => board[r][c] === "");
  if (emptyCorners.length > 0) {
    return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
  }

  // Take any empty cell
  const emptyCells: [number, number][] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === "") emptyCells.push([r, c]);
    }
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}
