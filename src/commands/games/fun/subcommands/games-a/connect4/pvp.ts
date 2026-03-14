// src/commands/fun/subcommands/connect4/pvp.ts
// Connect 4 PvP: collector, moves, extend, timeout.

import { ComponentType, type ChatInputCommandInteraction, type User } from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import {
  safeReplyToButton,
  safeDeferUpdate,
  safeEditReply,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import { recordResult } from "./connect4Store.js";
import { newBoard, drop, has4, full, type Cell } from "./gameLogic.js";
import { renderBoard, buildControls, buildHeader, EMOJI } from "./ui.js";
import { MOVE_TIMEOUT_MS, WARNING_BEFORE_MS } from "../../../../../../utils/constants.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

export async function runPvP(
  interaction: ChatInputCommandInteraction,
  p1: User,
  p2: User,
): Promise<void> {
  const board = newBoard();
  let turn: 1 | 2 = 1;
  const gameId = interaction.id;

  logger.info({ gameId, p1Id: p1.id, p2Id: p2.id }, "[connect4] game started");

  const render = (statusLine?: string) =>
    [
      buildHeader(p1, p2, turn),
      "",
      renderBoard(board),
      "",
      statusLine ?? "Pick a column. ⏱️ 30 min per move (starter can extend)",
    ].join("\n");

  const msg = await interaction.editReply({
    content: render(),
    components: buildControls({ gameId, board, disabled: false }),
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS,
  });

  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleWarning = () => {
    if (warningTimer) clearTimeout(warningTimer);
    warningTimer = setTimeout(() => {
      void safeEditReply(
        interaction,
        {
          content: render("⏱️ **1 minute left!** Pick a column."),
          components: buildControls({ gameId, board, disabled: false }),
        },
        "connect4.warning",
      );
    }, MOVE_TIMEOUT_MS - WARNING_BEFORE_MS);
  };
  scheduleWarning();

  collector.on("collect", async (btn) => {
    try {
      const isP1 = btn.user.id === p1.id;
      const isP2 = btn.user.id === p2.id;

      if (!isP1 && !isP2) {
        await safeReplyToButton(btn, "You're not in this game.");
        return;
      }

      if (btn.customId === `c4:extend:${gameId}`) {
        if (btn.user.id !== p1.id) {
          await safeReplyToButton(
            btn,
            "Only the person who started the game can extend time.",
          );
          return;
        }
        collector.resetTimer();
        scheduleWarning();
        if (await safeDeferUpdate(btn)) {
          const ok = await safeEditReply(
            interaction,
            {
              content: render("⏱️ **Time extended!** +30 min for this move."),
              components: buildControls({ gameId, board, disabled: false }),
            },
            "connect4.extend",
          );
          if (!ok) await notifyGameMessageGone(btn, "connect4").catch(() => {});
        }
        return;
      }

      const expectedUserId = turn === 1 ? p1.id : p2.id;
      if (btn.user.id !== expectedUserId) {
        await safeReplyToButton(btn, "Not your turn.");
        return;
      }

      const m = btn.customId.match(/^c4:(\d+):(.+)$/);
      if (!m) {
        await btn.deferUpdate().catch(() => {});
        return;
      }

      const col = Number(m[1]);
      if (!Number.isFinite(col)) {
        await btn.deferUpdate().catch(() => {});
        return;
      }

      const who: Cell = turn === 1 ? 1 : 2;
      const placed = drop(board, col, who);

      if (!placed.ok) {
        await safeReplyToButton(btn, "That column is full. Pick another.");
        return;
      }

      if (!(await safeDeferUpdate(btn))) return;

      if (has4(board, who)) {
        const winnerId = turn === 1 ? p1.id : p2.id;
        const loserId = turn === 1 ? p2.id : p1.id;

        try {
          recordResult(winnerId, loserId, p1.id, p2.id);
        } catch (err) {
          logger.error({ err }, "[connect4] record result threw");
        }
        const winnerXp = awardXp(winnerId, 22);
        const loserXp = awardXp(loserId, 8);

        collector.stop("win");
        const okWin = await safeEditReply(
          interaction,
          {
            content: [
              "🏁 **Game over**",
              `${turn === 1 ? EMOJI.p1 : EMOJI.p2} ${btn.user.toString()} wins!`,
              `✨ Winner: +${winnerXp.amount} XP${winnerXp.leveledUp ? ` (Level ${winnerXp.after.level}!)` : ""}`,
              `✨ Other player: +${loserXp.amount} XP${loserXp.leveledUp ? ` (Level ${loserXp.after.level}!)` : ""}`,
              "",
              renderBoard(board),
            ].join("\n"),
            components: buildControls({ gameId, board, disabled: true }),
          },
          "connect4.win",
        );
        if (!okWin) await notifyGameMessageGone(btn, "connect4").catch(() => {});
        return;
      }

      if (full(board)) {
        try {
          recordResult(null, null, p1.id, p2.id);
        } catch (err) {
          logger.error({ err }, "[connect4] record tie threw");
        }
        const p1Xp = awardXp(p1.id, 12);
        const p2Xp = awardXp(p2.id, 12);

        collector.stop("draw");
        const okDraw = await safeEditReply(
          interaction,
          {
            content: [
              "🏁 **Game over**",
              "It's a draw.",
              `✨ ${p1.username}: +${p1Xp.amount} XP${p1Xp.leveledUp ? ` (Level ${p1Xp.after.level}!)` : ""}`,
              `✨ ${p2.username}: +${p2Xp.amount} XP${p2Xp.leveledUp ? ` (Level ${p2Xp.after.level}!)` : ""}`,
              "",
              renderBoard(board),
            ].join("\n"),
            components: buildControls({ gameId, board, disabled: true }),
          },
          "connect4.draw",
        );
        if (!okDraw) await notifyGameMessageGone(btn, "connect4").catch(() => {});
        return;
      }

      turn = turn === 1 ? 2 : 1;
      collector.resetTimer();
      scheduleWarning();

      const okTurn = await safeEditReply(
        interaction,
        {
          content: render(),
          components: buildControls({ gameId, board, disabled: false }),
        },
        "connect4.turn",
      );
      if (!okTurn) await notifyGameMessageGone(btn, "connect4").catch(() => {});
    } catch (err) {
      recordInteractionRecovery("connect4");
      logger.warn(
        { err, interactionFailedRecovery: true },
        "[fun/connect4] connect4 handler threw",
      );
    }
  });

  collector.on("end", async (_c, reason) => {
    if (warningTimer) clearTimeout(warningTimer);
    if (reason === "win" || reason === "draw") return;

    const timeoutLoser = turn === 1 ? p1 : p2;
    const timeoutWinner = turn === 1 ? p2 : p1;

    try {
      recordResult(timeoutWinner.id, timeoutLoser.id, p1.id, p2.id);
    } catch (err) {
      logger.error({ err }, "[connect4] record timeout result threw");
    }
    const winnerXp = awardXp(timeoutWinner.id, 18);
    const loserXp = awardXp(timeoutLoser.id, 6);

    await safeEditReply(
      interaction,
      {
        content: [
          "⏱️ **Connect 4 expired**",
          `${timeoutLoser.toString()} ran out of time!`,
          `${timeoutWinner.toString()} wins by timeout!`,
          `✨ Winner: +${winnerXp.amount} XP${winnerXp.leveledUp ? ` (Level ${winnerXp.after.level}!)` : ""}`,
          `✨ Other player: +${loserXp.amount} XP${loserXp.leveledUp ? ` (Level ${loserXp.after.level}!)` : ""}`,
          "",
          renderBoard(board),
        ].join("\n"),
        components: buildControls({ gameId, board, disabled: true }),
      },
      "connect4.timeout",
    ).catch(() => {});
  });
}
