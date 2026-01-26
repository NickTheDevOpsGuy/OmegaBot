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

type Cell = 0 | 1 | 2; // 0 empty, 1 p1, 2 p2

const ROWS = 6;
const COLS = 7;

const EMOJI = {
  empty: "⚪",
  p1: "🔴",
  p2: "🟡",
};

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
    [0, 1], // horiz
    [1, 0], // vert
    [1, 1], // diag down-right
    [1, -1], // diag down-left
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

function controls(args: { gameId: string; disabled: boolean }) {
  const { gameId, disabled } = args;

  const mk = (col: number, label: string) =>
    new ButtonBuilder()
      .setCustomId(`c4:${col}:${gameId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled);

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

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Optional opponent
  const opponent = interaction.options.getUser("user");
  const p1 = interaction.user;
  const p2 = opponent && opponent.id !== p1.id ? opponent : null;

  if (!p2) {
    await interaction.editReply(
      "Connect 4 needs an opponent. Use: `/fun connect4 user:@someone`",
    );
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
      statusLine ?? "Pick a column.",
    ].join("\n");

  const msg = await interaction.editReply({
    content: render(),
    components: controls({ gameId, disabled: false }),
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60_000,
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
        collector.stop("win");
        await interaction.editReply({
          content: [
            "🏁 **Game over**",
            `${turn === 1 ? EMOJI.p1 : EMOJI.p2} ${btn.user.toString()} wins!`,
            "",
            renderBoard(board),
          ].join("\n"),
          components: controls({ gameId, disabled: true }),
        });
        return;
      }

      if (full(board)) {
        collector.stop("draw");
        await interaction.editReply({
          content: ["🏁 **Game over**", "It's a draw.", "", renderBoard(board)].join(
            "\n",
          ),
          components: controls({ gameId, disabled: true }),
        });
        return;
      }

      // next turn
      turn = turn === 1 ? 2 : 1;

      await interaction.editReply({
        content: render(),
        components: controls({ gameId, disabled: false }),
      });
    } catch (err) {
      logger.warn({ err }, "[fun/connect4] handler failed");
    }
  });

  collector.on("end", async (_c, reason) => {
    try {
      if (reason === "win" || reason === "draw") return;

      await interaction.editReply({
        content: [
          "⏱️ **Connect 4 expired**",
          "Run `/fun connect4 user:@someone` to start a new game.",
          "",
          renderBoard(board),
        ].join("\n"),
        components: controls({ gameId, disabled: true }),
      });
    } catch (err) {
      logger.debug({ err }, "[fun/connect4] end edit failed");
    }
  });
}
