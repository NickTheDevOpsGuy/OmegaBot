// src/services/games/gameEngine.ts
//
// Facade for game state and moves. Used by Discord commands and future web API.
// Delegates to sessionManager and game-specific logic (e.g. connect4).

import {
  getSession,
  getSessionInternal,
  saveSession,
  updateSessionStatus,
  type GameSession,
} from "./sessionManager.js";
import { deserializeState } from "../../commands/games/fun/subcommands/games-a/connect4/sessionPersistence.js";
import {
  drop,
  has4,
  full,
  type Cell,
} from "../../commands/games/fun/subcommands/games-a/connect4/gameLogic.js";

export type GameState = {
  gameId: string;
  gameType: string;
  player1Id: string;
  player2Id: string | null;
  boardState: string;
  currentTurn: string | null;
  status: string;
  expiresAt: number;
};

export type MoveResult =
  | { ok: true; winner?: string; draw?: boolean }
  | { ok: false; error: string };

/**
 * Get public game state for API/Discord. Does not return internal-only fields.
 */
export function getGameState(gameId: string): GameState | null {
  const session = getSessionInternal(gameId, { activeOnly: false });
  if (!session) return null;
  return {
    gameId: session.gameId,
    gameType: session.gameType,
    player1Id: session.player1Id,
    player2Id: session.player2Id,
    boardState: session.boardState,
    currentTurn: session.currentTurn,
    status: session.status,
    expiresAt: session.expiresAt,
  };
}

/**
 * Apply a move for a game. Supports connect4; other games can be added.
 * Returns result with ok, and optionally winner or draw.
 */
export function applyGameMove(
  gameId: string,
  userId: string,
  payload: { col?: number },
): MoveResult {
  const session = getSession(gameId) as GameSession | null;
  if (!session) return { ok: false, error: "Game not found or expired" };

  if (session.gameType === "connect4") {
    const state = deserializeState(session.boardState);
    if (!state) return { ok: false, error: "Invalid game state" };
    const col = payload.col;
    if (col == null || col < 0 || col > 6) return { ok: false, error: "Invalid column" };
    const expectedTurn = session.currentTurn;
    if (userId !== expectedTurn) return { ok: false, error: "Not your turn" };
    const who: Cell = session.player1Id === userId ? 1 : 2;
    const placed = drop(state.board, col, who);
    if (!placed.ok) return { ok: false, error: "Column full" };

    if (has4(state.board, who)) {
      updateSessionStatus(gameId, "finished");
      saveSession({
        ...session,
        boardState: JSON.stringify({ board: state.board, turn: who }),
        status: "finished",
      });
      return { ok: true, winner: userId };
    }
    if (full(state.board)) {
      updateSessionStatus(gameId, "finished");
      saveSession({
        ...session,
        boardState: JSON.stringify({ board: state.board, turn: state.turn }),
        status: "finished",
      });
      return { ok: true, draw: true };
    }

    const nextTurn = who === 1 ? session.player2Id! : session.player1Id;
    const nextTurnNum = who === 1 ? 2 : 1;
    const newState = { board: state.board, turn: nextTurnNum as 1 | 2 };
    saveSession({
      ...session,
      boardState: JSON.stringify(newState),
      currentTurn: nextTurn,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  return { ok: false, error: "Unsupported game type" };
}
