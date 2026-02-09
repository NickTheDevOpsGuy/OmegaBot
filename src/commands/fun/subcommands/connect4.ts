// src/commands/fun/subcommands/connect4.ts
import { ComponentType, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  safeReplyToButton,
  safeDeferUpdate,
  safeEditReply,
} from "../../../services/discord/safeReply.js";
import { getStats, recordResult } from "./connect4Store.js";
import { newBoard, drop, has4, full, type Cell } from "./connect4/gameLogic.js";
import { renderBoard, buildControls, buildHeader, EMOJI } from "./connect4/ui.js";

const MOVE_TIMEOUT_MS = 600_000; // 10 minutes per move
const WARNING_BEFORE_MS = 60_000; // Remind 1 min before timeout

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("user");

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const total = stats.wins + stats.losses + stats.ties;

    await interaction.editReply(
      [
        `🔴🟡 **Connect 4 Stats for ${interaction.user}**`,
        "",
        `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
        `Win Rate: ${stats.winRate}%`,
      ].join("\n"),
    );
    return;
  }

  const p1 = interaction.user;
  const p2 = opponent && opponent.id !== p1.id ? opponent : null;

  if (!p2) {
    await interaction.editReply(
      "Connect 4 needs an opponent. Use: `/fun connect4 user:@someone`",
    );
    return;
  }

  if (p2.bot) {
    await interaction.editReply("You can't play against a bot!");
    return;
  }

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
      statusLine ?? "Pick a column. ⏱️ 10 min per move (starter can extend)",
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

      // Only the game starter (p1) can extend time
      if (btn.customId === `c4:extend:${gameId}`) {
        if (btn.user.id !== p1.id) {
          await safeReplyToButton(btn, "Only the person who started the game can extend time.");
          return;
        }
        collector.resetTimer();
        scheduleWarning();
        if (await safeDeferUpdate(btn)) {
          await safeEditReply(
            interaction,
            {
              content: render("⏱️ **Time extended!** +10 min for this move."),
              components: buildControls({ gameId, board, disabled: false }),
            },
            "connect4.extend",
          );
        }
        return;
      }

      const expectedUserId = turn === 1 ? p1.id : p2.id;
      if (btn.user.id !== expectedUserId) {
        await safeReplyToButton(btn, "Not your turn.");
        return;
      }

      const m = btn.customId.match(/^c4:(\d+):(.+)$/);
      if (!m) return;

      const col = Number(m[1]);
      if (!Number.isFinite(col)) return;

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
          logger.error({ err }, "[connect4] failed to record result");
        }

        collector.stop("win");
        await safeEditReply(
          interaction,
          {
            content: [
              "🏁 **Game over**",
              `${turn === 1 ? EMOJI.p1 : EMOJI.p2} ${btn.user.toString()} wins!`,
              "",
              renderBoard(board),
            ].join("\n"),
            components: buildControls({ gameId, board, disabled: true }),
          },
          "connect4.win",
        );
        return;
      }

      if (full(board)) {
        try {
          recordResult(null, null, p1.id, p2.id);
        } catch (err) {
          logger.error({ err }, "[connect4] failed to record tie");
        }

        collector.stop("draw");
        await safeEditReply(
          interaction,
          {
            content: ["🏁 **Game over**", "It's a draw.", "", renderBoard(board)].join(
              "\n",
            ),
            components: buildControls({ gameId, board, disabled: true }),
          },
          "connect4.draw",
        );
        return;
      }

      turn = turn === 1 ? 2 : 1;
      collector.resetTimer();
      scheduleWarning();

      await safeEditReply(
        interaction,
        {
          content: render(),
          components: buildControls({ gameId, board, disabled: false }),
        },
        "connect4.turn",
      );
    } catch (err) {
      logger.warn({ err }, "[fun/connect4] handler failed");
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
      logger.error({ err }, "[connect4] failed to record timeout result");
    }

    await safeEditReply(
      interaction,
      {
        content: [
          "⏱️ **Connect 4 expired**",
          `${timeoutLoser.toString()} ran out of time!`,
          `${timeoutWinner.toString()} wins by timeout!`,
          "",
          renderBoard(board),
        ].join("\n"),
        components: buildControls({ gameId, board, disabled: true }),
      },
      "connect4.timeout",
    );
  });
}
