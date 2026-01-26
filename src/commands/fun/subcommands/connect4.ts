// src/commands/fun/subcommands/connect4.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

type Cell = 0 | 1 | 2; // 0 empty, 1 p1 (red), 2 p2 (yellow)

const ROWS = 6;
const COLS = 7;
const MOVE_TIMEOUT_MS = 60_000;

const EMOJI = {
  empty: "⚫",
  p1: "🔴",
  p2: "🟡",
};

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureConnect4Table(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS connect4_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connect4_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );
  `);
}

type C4Stats = {
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
};

function getStats(userId: string): C4Stats {
  ensureConnect4Table();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number };
  const row = db
    .prepare(`SELECT wins, losses, ties FROM connect4_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, ties: 0, winRate: 0 };

  const total = row.wins + row.losses + row.ties;
  return { ...row, winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0 };
}

function recordResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  ensureConnect4Table();
  const db = getDb();
  const now = Date.now();

  if (winnerId && loserId) {
    db.prepare(
      `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 1, 0, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET wins = wins + 1, updated_at = ?`,
    ).run(winnerId, now, now);

    db.prepare(
      `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 0, 1, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET losses = losses + 1, updated_at = ?`,
    ).run(loserId, now, now);
  } else {
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
         VALUES (?, 0, 0, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET ties = ties + 1, updated_at = ?`,
      ).run(id, now, now);
    }
  }

  // H2H tracking
  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `INSERT INTO connect4_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user1_id, user2_id) DO UPDATE SET
       user1_wins = user1_wins + ?,
       user2_wins = user2_wins + ?,
       ties = ties + ?,
       updated_at = ?`,
  ).run(
    id1,
    id2,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
  );
}

/* -------------------------------------------------------------------------- */
/* Game Logic                                                                  */
/* -------------------------------------------------------------------------- */

function newBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0 as Cell),
  );
}

function renderBoard(board: Cell[][]): string {
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

function drop(board: Cell[][], col: number, who: Cell): { ok: boolean; row?: number } {
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

function has4(board: Cell[][], who: Cell): boolean {
  const dirs = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
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

function full(board: Cell[][]): boolean {
  return board[0].every((c) => c !== 0);
}

function controls(args: { gameId: string; board: Cell[][]; disabled: boolean }) {
  const { gameId, board, disabled } = args;

  const mk = (col: number, label: string) =>
    new ButtonBuilder()
      .setCustomId(`c4:${col}:${gameId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || board[0][col] !== 0);

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      mk(0, "1"),
      mk(1, "2"),
      mk(2, "3"),
      mk(3, "4"),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      mk(4, "5"),
      mk(5, "6"),
      mk(6, "7"),
    ),
  ];
}

function header(p1: User, p2: User, turn: 1 | 2): string {
  const who =
    turn === 1 ? `${EMOJI.p1} ${p1.toString()}` : `${EMOJI.p2} ${p2.toString()}`;
  return `🔴🟡 **Connect 4**\nTurn: ${who}`;
}

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

  const render = (statusLine?: string) =>
    [
      header(p1, p2, turn),
      "",
      renderBoard(board),
      "",
      statusLine ?? "Pick a column. ⏱️ 60s per move",
    ].join("\n");

  const msg = await interaction.editReply({
    content: render(),
    components: controls({ gameId, board, disabled: false }),
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS,
  });

  collector.on("collect", async (btn) => {
    try {
      const isP1 = btn.user.id === p1.id;
      const isP2 = btn.user.id === p2.id;

      if (!isP1 && !isP2) {
        await btn.reply({ content: "You're not in this game.", ephemeral: true });
        return;
      }

      const expectedUserId = turn === 1 ? p1.id : p2.id;
      if (btn.user.id !== expectedUserId) {
        await btn.reply({ content: "Not your turn.", ephemeral: true });
        return;
      }

      const m = btn.customId.match(/^c4:(\d+):(.+)$/);
      if (!m) return;

      const col = Number(m[1]);
      if (!Number.isFinite(col)) return;

      const who: Cell = turn === 1 ? 1 : 2;
      const placed = drop(board, col, who);

      if (!placed.ok) {
        await btn.reply({
          content: "That column is full. Pick another.",
          ephemeral: true,
        });
        return;
      }

      await btn.deferUpdate();

      if (has4(board, who)) {
        const winnerId = turn === 1 ? p1.id : p2.id;
        const loserId = turn === 1 ? p2.id : p1.id;

        try {
          recordResult(winnerId, loserId, p1.id, p2.id);
        } catch (err) {
          logger.error({ err }, "[connect4] failed to record result");
        }

        collector.stop("win");
        await interaction.editReply({
          content: [
            "🏁 **Game over**",
            `${turn === 1 ? EMOJI.p1 : EMOJI.p2} ${btn.user.toString()} wins!`,
            "",
            renderBoard(board),
          ].join("\n"),
          components: controls({ gameId, board, disabled: true }),
        });
        return;
      }

      if (full(board)) {
        try {
          recordResult(null, null, p1.id, p2.id);
        } catch (err) {
          logger.error({ err }, "[connect4] failed to record tie");
        }

        collector.stop("draw");
        await interaction.editReply({
          content: ["🏁 **Game over**", "It's a draw.", "", renderBoard(board)].join(
            "\n",
          ),
          components: controls({ gameId, board, disabled: true }),
        });
        return;
      }

      // Next turn
      turn = turn === 1 ? 2 : 1;
      collector.resetTimer();

      await interaction.editReply({
        content: render(),
        components: controls({ gameId, board, disabled: false }),
      });
    } catch (err) {
      logger.warn({ err }, "[fun/connect4] handler failed");
    }
  });

  collector.on("end", async (_c, reason) => {
    try {
      if (reason === "win" || reason === "draw") return;

      const timeoutLoser = turn === 1 ? p1 : p2;
      const timeoutWinner = turn === 1 ? p2 : p1;

      try {
        recordResult(timeoutWinner.id, timeoutLoser.id, p1.id, p2.id);
      } catch (err) {
        logger.error({ err }, "[connect4] failed to record timeout result");
      }

      await interaction.editReply({
        content: [
          "⏱️ **Connect 4 expired**",
          `${timeoutLoser.toString()} ran out of time!`,
          `${timeoutWinner.toString()} wins by timeout!`,
          "",
          renderBoard(board),
        ].join("\n"),
        components: controls({ gameId, board, disabled: true }),
      });
    } catch (err) {
      logger.debug({ err }, "[fun/connect4] end edit failed");
    }
  });
}
