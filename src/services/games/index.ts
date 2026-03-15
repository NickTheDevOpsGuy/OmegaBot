// src/services/games/index.ts
// Game services: result rendering, progression, random events, sessions, image placeholder.

export {
  buildGameResultEmbed,
  buildGameResultReplyPayload,
  type GameResultInput,
  type GameOutcome,
} from "./gameResultRenderer.js";
export {
  awardXp,
  getUserProgression,
  processGameProgression,
  type ProgressionResult,
  type AwardXpResult,
  type Progression,
} from "./progressionEngine.js";
export {
  rollRandomEvent,
  type RandomEventKind,
  type RandomEventConfig,
  type RandomEventResult,
} from "./randomEvents.js";
export {
  renderGameImage,
  isImageRenderingAvailable,
} from "./imageRenderer.js";
export {
  getSession,
  getSessionInternal,
  saveSession,
  updateSessionStatus,
  deleteSession,
  listActiveForUser,
  pruneExpiredSessions,
  getExpiryForGameType,
  DEFAULT_SESSION_EXPIRY_MS,
  THREE_DAYS_MS,
  SESSION_EXPIRY_MS_BY_GAME,
  type GameSession,
  type SessionStatus,
} from "./sessionManager.js";
export {
  getGameState,
  applyGameMove,
  type GameState,
  type MoveResult,
} from "./gameEngine.js";
