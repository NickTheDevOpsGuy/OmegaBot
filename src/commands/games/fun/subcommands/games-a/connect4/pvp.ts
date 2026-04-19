// src/commands/games/fun/subcommands/connect4/pvp.ts
// Connect 4 PvP: persistent sessions, 72h expiry, turn-based async play.

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type Message,
  type User,
} from "discord.js";
import { randomUUID } from "node:crypto";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import {
  safeReplyToButton,
  safeDeferUpdate,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import {
  getSession,
  getSessionInternal,
  saveSession,
  updateSessionStatus,
  getExpiryForGameType,
  type GameSession,
} from "../../../../../../services/games/sessionManager.js";
import { recordResult } from "./connect4Store.js";
import { drop, has4, full, type Cell } from "./gameLogic.js";
import { renderBoard, buildControls, buildHeader, EMOJI } from "./ui.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";
import {
  serializeState,
  deserializeState,
  initialState,
  type Connect4State,
} from "./sessionPersistence.js";

const GAME_TYPE = "connect4";
/** Collector lives 72h so players can take turns asynchronously. */
const COLLECTOR_MS = 72 * 60 * 60 * 1000;
/** Extend session by 24h on each move so active games don't expire mid-game. */
const EXTEND_ON_MOVE_MS = 24 * 60 * 60 * 1000;

function headerFromSession(session: GameSession, turn: 1 | 2): string {
  const p1 = { toString: () => `<@${session.player1Id}>` };
  const p2 = { toString: () => `<@${session.player2Id}>` };
  return buildHeader(p1, p2, turn);
}

function renderContent(
  session: GameSession,
  state: Connect4State,
  statusLine?: string,
): string {
  return [
    headerFromSession(session, state.turn),
    "",
    renderBoard(state.board),
    "",
    statusLine ?? "Pick a column. ⏱️ Game stays active for 72 hours — take your time!",
  ].join("\n");
}

async function updateGameMessage(
  message: Message,
  session: GameSession,
  state: Connect4State,
  options: { disabled?: boolean; contentOverride?: string } = {},
): Promise<boolean> {
  try {
    const content = options.contentOverride ?? renderContent(session, state);
    await message.edit({
      content,
      components: buildControls({
        gameId: session.gameId,
        board: state.board,
        disabled: options.disabled ?? false,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function runPvP(
  interaction: ChatInputCommandInteraction,
  p1: User,
  p2: User,
): Promise<void> {
  const gameId = randomUUID();
  const state = initialState();

  const guildId = interaction.guildId ?? null;
  const channelId = interaction.channelId ?? null;

  saveSession({
    gameId,
    gameType: GAME_TYPE,
    guildId,
    channelId,
    messageId: null,
    player1Id: p1.id,
    player2Id: p2.id,
    boardState: serializeState(state.board, state.turn),
    currentTurn: p1.id,
    expiresAt: Date.now() + getExpiryForGameType(GAME_TYPE),
    status: "active",
  });

  logger.info({ gameId, p1Id: p1.id, p2Id: p2.id }, "[connect4] persistent game started");

  const initialSession: GameSession = {
    gameId,
    gameType: GAME_TYPE,
    guildId,
    channelId,
    messageId: null,
    player1Id: p1.id,
    player2Id: p2.id,
    boardState: serializeState(state.board, state.turn),
    currentTurn: p1.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + getExpiryForGameType(GAME_TYPE),
    status: "active",
  };
  const content = renderContent(initialSession, state);

  const msg = await interaction.editReply({
    content,
    components: buildControls({ gameId, board: state.board, disabled: false }),
  });

  saveSession({
    gameId,
    gameType: GAME_TYPE,
    guildId,
    channelId,
    messageId: msg.id,
    player1Id: p1.id,
    player2Id: p2.id,
    boardState: serializeState(state.board, state.turn),
    currentTurn: p1.id,
    expiresAt: Date.now() + getExpiryForGameType(GAME_TYPE),
    status: "active",
  });

  runCollector(msg, gameId);
}

/** Interaction that can editReply (slash or button). */
type EditableInteraction = {
  editReply(
    options: Parameters<ChatInputCommandInteraction["editReply"]>[0],
  ): Promise<Message>;
  user: User;
};

/** Resume an existing game: show board and run collector on the given message. */
export async function runResume(
  interaction: ChatInputCommandInteraction | EditableInteraction,
  gameId: string,
): Promise<void> {
  const session = getSession(gameId);
  if (!session) {
    await interaction.editReply({
      content:
        "That game has ended or expired. Start a new one with `/fun connect4 user:@opponent`.",
    });
    return;
  }
  const state = deserializeState(session.boardState);
  if (!state) {
    await interaction.editReply(
      "This game’s data is invalid. Start a new game with `/fun connect4 user:@opponent`.",
    );
    return;
  }
  if (
    interaction.user.id !== session.player1Id &&
    interaction.user.id !== session.player2Id
  ) {
    await interaction.editReply("You’re not in this game.");
    return;
  }

  const content = renderContent(session, state);
  const msg = await interaction.editReply({
    content,
    components: buildControls({ gameId, board: state.board, disabled: false }),
  });

  saveSession({
    ...session,
    messageId: msg.id,
    boardState: serializeState(state.board, state.turn),
    expiresAt: Date.now() + EXTEND_ON_MOVE_MS,
  });

  runCollector(msg, gameId);
}

function runCollector(msg: Message, gameId: string): void {
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_MS,
  });

  collector.on("collect", async (btn) => {
    try {
      const parts = btn.customId.split(":");
      if (parts[0] !== "c4") {
        await btn.deferUpdate().catch(() => {});
        return;
      }
      const session = getSession(gameId);
      if (!session) {
        await safeReplyToButton(btn, "This game has ended or expired.");
        return;
      }
      const state = deserializeState(session.boardState);
      if (!state) {
        await safeReplyToButton(btn, "This game’s data is invalid.");
        return;
      }

      const isP1 = btn.user.id === session.player1Id;
      const isP2 = btn.user.id === session.player2Id;
      if (!isP1 && !isP2) {
        await safeReplyToButton(btn, "You're not in this game.");
        return;
      }

      if (parts[1] === "extend") {
        if (btn.user.id !== session.player1Id) {
          await safeReplyToButton(
            btn,
            "Only the person who started the game can extend time.",
          );
          return;
        }
        collector.resetTimer();
        const newExpires = Date.now() + EXTEND_ON_MOVE_MS;
        saveSession({
          ...session,
          boardState: serializeState(state.board, state.turn),
          currentTurn: state.turn === 1 ? session.player1Id : session.player2Id!,
          expiresAt: newExpires,
        });
        if (await safeDeferUpdate(btn)) {
          const ok = await updateGameMessage(msg, session, state, {
            contentOverride: renderContent(
              session,
              state,
              "⏱️ **Time extended!** You have more time to play.",
            ),
          });
          if (!ok) await notifyGameMessageGone(btn, "connect4").catch(() => {});
        }
        return;
      }

      const col = Number(parts[1]);
      if (!Number.isFinite(col) || col < 0 || col > 6) {
        await btn.deferUpdate().catch(() => {});
        return;
      }

      const expectedUserId = state.turn === 1 ? session.player1Id : session.player2Id!;
      if (btn.user.id !== expectedUserId) {
        await safeReplyToButton(btn, "Not your turn.");
        return;
      }

      const who: Cell = state.turn === 1 ? 1 : 2;
      const placed = drop(state.board, col, who);

      if (!placed.ok) {
        await safeReplyToButton(btn, "That column is full. Pick another.");
        return;
      }

      if (!(await safeDeferUpdate(btn))) return;

      if (has4(state.board, who)) {
        const winnerId = state.turn === 1 ? session.player1Id : session.player2Id!;
        const loserId = state.turn === 1 ? session.player2Id! : session.player1Id;
        try {
          recordResult(winnerId, loserId, session.player1Id, session.player2Id!);
        } catch (err) {
          getContextLogger().error({ err }, "[connect4] record result threw");
        }
        const winnerXp = awardXp(winnerId, 22);
        const loserXp = awardXp(loserId, 8);
        updateSessionStatus(gameId, "finished");
        saveSession({
          ...session,
          boardState: serializeState(state.board, state.turn),
          status: "finished",
        });
        collector.stop("win");
        const winContent = [
          "🏁 **Game over**",
          `${state.turn === 1 ? EMOJI.p1 : EMOJI.p2} ${btn.user.toString()} wins!`,
          `✨ Winner: +${winnerXp.amount} XP${winnerXp.leveledUp ? ` (Level ${winnerXp.after.level}!)` : ""}`,
          `✨ Other player: +${loserXp.amount} XP${loserXp.leveledUp ? ` (Level ${loserXp.after.level}!)` : ""}`,
          "",
          renderBoard(state.board),
        ].join("\n");
        await updateGameMessage(msg, session, state, {
          disabled: true,
          contentOverride: winContent,
        }).catch(() => {});
        return;
      }

      if (full(state.board)) {
        try {
          recordResult(null, null, session.player1Id, session.player2Id!);
        } catch (err) {
          getContextLogger().error({ err }, "[connect4] record tie threw");
        }
        const p1Xp = awardXp(session.player1Id, 12);
        const p2Xp = awardXp(session.player2Id!, 12);
        updateSessionStatus(gameId, "finished");
        saveSession({
          ...session,
          boardState: serializeState(state.board, state.turn),
          status: "finished",
        });
        collector.stop("draw");
        const drawContent = [
          "🏁 **Game over**",
          "It's a draw.",
          `✨ <@${session.player1Id}>: +${p1Xp.amount} XP${p1Xp.leveledUp ? ` (Level ${p1Xp.after.level}!)` : ""}`,
          `✨ <@${session.player2Id}>: +${p2Xp.amount} XP${p2Xp.leveledUp ? ` (Level ${p2Xp.after.level}!)` : ""}`,
          "",
          renderBoard(state.board),
        ].join("\n");
        await updateGameMessage(msg, session, state, {
          disabled: true,
          contentOverride: drawContent,
        }).catch(() => {});
        return;
      }

      const nextTurn = state.turn === 1 ? 2 : 1;
      const nextTurnUserId = nextTurn === 1 ? session.player1Id : session.player2Id!;
      const newState: Connect4State = { board: state.board, turn: nextTurn };
      const newExpires = Date.now() + EXTEND_ON_MOVE_MS;
      saveSession({
        ...session,
        boardState: serializeState(newState.board, newState.turn),
        currentTurn: nextTurnUserId,
        expiresAt: newExpires,
      });
      collector.resetTimer();

      await updateGameMessage(msg, session, newState).catch(() => {});
      try {
        await btn.client.users.send(nextTurnUserId, {
          content:
            "It's your turn in **Connect 4**! Check the game message in the channel to make your move.",
        });
      } catch (err) {
        getContextLogger().debug(
          { err, gameId, nextTurnUserId },
          "[fun/connect4] turn reminder DM skipped",
        );
      }
    } catch (err) {
      recordInteractionRecovery("connect4");
      getContextLogger().warn(
        { err, interactionFailedRecovery: true },
        "[fun/connect4] connect4 handler threw",
      );
    }
  });

  collector.on("end", async (_c, reason) => {
    if (reason === "win" || reason === "draw") return;

    const session = getSessionInternal(gameId, { activeOnly: false });
    if (session) {
      const state = deserializeState(session.boardState);
      updateSessionStatus(gameId, "abandoned");
      if (state) {
        const timeoutLoserId = state.turn === 1 ? session.player1Id : session.player2Id!;
        const timeoutWinnerId =
          timeoutLoserId === session.player1Id ? session.player2Id! : session.player1Id;
        try {
          recordResult(
            timeoutWinnerId,
            timeoutLoserId,
            session.player1Id,
            session.player2Id!,
          );
        } catch (err) {
          getContextLogger().error({ err }, "[connect4] record timeout result threw");
        }
        const winnerXp = awardXp(timeoutWinnerId, 18);
        const loserXp = awardXp(timeoutLoserId, 6);
        const timeoutContent = [
          "⏱️ **Connect 4 expired**",
          `<@${timeoutLoserId}> ran out of time!`,
          `<@${timeoutWinnerId}> wins by timeout!`,
          `✨ Winner: +${winnerXp.amount} XP${winnerXp.leveledUp ? ` (Level ${winnerXp.after.level}!)` : ""}`,
          `✨ Other player: +${loserXp.amount} XP${loserXp.leveledUp ? ` (Level ${loserXp.after.level}!)` : ""}`,
          "",
          renderBoard(state.board),
        ].join("\n");
        try {
          await msg.edit({
            content: timeoutContent,
            components: buildControls({ gameId, board: state.board, disabled: true }),
          });
        } catch {
          // message may be deleted
        }
      }
    }
  });
}
