// src/commands/fun/subcommands/tictactoe.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

type CellValue = "" | "X" | "O";
type Board = [
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue],
];

const CELL_EMOJI: Record<CellValue, string> = {
  "": "⬜",
  X: "❌",
  O: "⭕",
};

const MOVE_TIMEOUT_MS = 60_000; // 60 seconds per move

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureTttTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ttt_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ttt_h2h (
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

type TttStats = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
};

function getStats(userId: string): TttStats {
  ensureTttTable();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number };

  const row = db
    .prepare(`SELECT wins, losses, ties FROM ttt_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { wins: row.wins, losses: row.losses, ties: row.ties, total, winRate };
}

function recordResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  ensureTttTable();
  const db = getDb();
  const now = Date.now();

  if (winnerId && loserId) {
    // Winner
    db.prepare(
      `INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 1, 0, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET wins = wins + 1, updated_at = ?`,
    ).run(winnerId, now, now);

    // Loser
    db.prepare(
      `INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 0, 1, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET losses = losses + 1, updated_at = ?`,
    ).run(loserId, now, now);
  } else {
    // Tie
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
         VALUES (?, 0, 0, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET ties = ties + 1, updated_at = ?`,
      ).run(id, now, now);
    }
  }

  // Update head-to-head
  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `INSERT INTO ttt_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
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

type H2HStats = {
  user1Wins: number;
  user2Wins: number;
  ties: number;
  total: number;
};

function getH2HStats(userId1: string, userId2: string): H2HStats {
  ensureTttTable();
  const db = getDb();

  const [id1, id2] = [userId1, userId2].sort();

  type H2HRow = { user1_wins: number; user2_wins: number; ties: number };

  const row = db
    .prepare(
      `SELECT user1_wins, user2_wins, ties FROM ttt_h2h WHERE user1_id = ? AND user2_id = ?`,
    )
    .get(id1, id2) as H2HRow | undefined;

  if (!row) {
    return { user1Wins: 0, user2Wins: 0, ties: 0, total: 0 };
  }

  const user1Wins = userId1 === id1 ? row.user1_wins : row.user2_wins;
  const user2Wins = userId1 === id1 ? row.user2_wins : row.user1_wins;

  return {
    user1Wins,
    user2Wins,
    ties: row.ties,
    total: row.user1_wins + row.user2_wins + row.ties,
  };
}

/* -------------------------------------------------------------------------- */
/* Game logic                                                                  */
/* -------------------------------------------------------------------------- */

function createEmptyBoard(): Board {
  return [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
}

function checkWinner(board: Board): CellValue {
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

function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== ""));
}

function getBotMove(board: Board): [number, number] {
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

/* -------------------------------------------------------------------------- */
/* UI Builders                                                                 */
/* -------------------------------------------------------------------------- */

function buildBoardButtons(
  gameId: string,
  board: Board,
  disabled = false,
  winningCells: [number, number][] = [],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (let c = 0; c < 3; c++) {
      const cell = board[r][c];
      const isWinningCell = winningCells.some(([wr, wc]) => wr === r && wc === c);

      let style = ButtonStyle.Secondary;
      if (cell === "X") style = ButtonStyle.Primary;
      else if (cell === "O") style = ButtonStyle.Danger;
      if (isWinningCell) style = ButtonStyle.Success;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${gameId}:${r}:${c}`)
          .setEmoji(CELL_EMOJI[cell])
          .setStyle(style)
          .setDisabled(disabled || cell !== ""),
      );
    }

    rows.push(row);
  }

  return rows;
}

function getWinningCells(board: Board): [number, number][] {
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

/* -------------------------------------------------------------------------- */
/* Game handlers                                                               */
/* -------------------------------------------------------------------------- */

async function playVsBot(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameId = `${Date.now()}-${interaction.user.id}`;
  const board = createEmptyBoard();
  const playerSymbol: CellValue = "X";
  const botSymbol: CellValue = "O";

  const message = await interaction.editReply({
    content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
    components: buildBoardButtons(gameId, board),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS * 9, // Max 9 moves
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`ttt:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    // Player move
    board[row][col] = playerSymbol;

    // Check for player win
    let winner = checkWinner(board);
    if (winner === playerSymbol) {
      const winningCells = getWinningCells(board);
      collector.stop("player_win");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🎉 **You win!**`,
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie
    if (isBoardFull(board)) {
      collector.stop("tie");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Bot move
    const [botRow, botCol] = getBotMove(board);
    board[botRow][botCol] = botSymbol;

    // Check for bot win
    winner = checkWinner(board);
    if (winner === botSymbol) {
      const winningCells = getWinningCells(board);
      collector.stop("bot_win");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n😢 **Bot wins!**`,
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie after bot move
    if (isBoardFull(board)) {
      collector.stop("tie");
      await buttonInteraction.update({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n🤝 **It's a tie!**`,
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Continue game
    await buttonInteraction.update({
      content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\nYour turn! Click a square.`,
      components: buildBoardButtons(gameId, board),
    });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await message.edit({
        content: `🎮 **Tic Tac Toe** — You (❌) vs Bot (⭕)\n\n⏱️ **Game timed out!**`,
        components: buildBoardButtons(gameId, board, true),
      });
    }
  });
}

async function playVsPlayer(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  if (opponent.id === challenger.id) {
    await interaction.editReply("You can't play against yourself!");
    return;
  }

  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Use `/fun tictactoe` without an opponent to play against me.",
    );
    return;
  }

  const gameId = `${Date.now()}-${challenger.id}-${opponent.id}`;
  const board = createEmptyBoard();

  // Randomly decide who goes first
  const xPlayer = Math.random() < 0.5 ? challenger : opponent;
  const oPlayer = xPlayer.id === challenger.id ? opponent : challenger;

  let currentPlayer = xPlayer;

  // Get head-to-head history
  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Record: ${challenger.username} ${h2h.user1Wins} - ${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const message = await interaction.editReply({
    content: [
      `🎮 **Tic Tac Toe**`,
      `❌ ${xPlayer} vs ⭕ ${oPlayer}${h2hText}`,
      ``,
      `${currentPlayer}'s turn (❌)`,
      `⏱️ 60 seconds per move`,
    ].join("\n"),
    components: buildBoardButtons(gameId, board),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MOVE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`ttt:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    // Only current player can move
    if (buttonInteraction.user.id !== currentPlayer.id) {
      await buttonInteraction.reply({
        content: "It's not your turn!",
        ephemeral: true,
      });
      return;
    }

    const [, , rowStr, colStr] = buttonInteraction.customId.split(":");
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    const symbol: CellValue = currentPlayer.id === xPlayer.id ? "X" : "O";
    board[row][col] = symbol;

    // Check for win
    const winner = checkWinner(board);
    if (winner) {
      const winningCells = getWinningCells(board);
      const winnerUser = winner === "X" ? xPlayer : oPlayer;
      const loserUser = winner === "X" ? oPlayer : xPlayer;

      try {
        recordResult(winnerUser.id, loserUser.id, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record result");
      }

      collector.stop("win");
      await buttonInteraction.update({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `🎉 **${winnerUser} wins!**`,
        ].join("\n"),
        components: buildBoardButtons(gameId, board, true, winningCells),
      });
      return;
    }

    // Check for tie
    if (isBoardFull(board)) {
      try {
        recordResult(null, null, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record tie");
      }

      collector.stop("tie");
      await buttonInteraction.update({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `🤝 **It's a tie!**`,
        ].join("\n"),
        components: buildBoardButtons(gameId, board, true),
      });
      return;
    }

    // Switch turns
    currentPlayer = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;
    const nextSymbol = currentPlayer.id === xPlayer.id ? "❌" : "⭕";

    // Reset timeout
    collector.resetTimer();

    await buttonInteraction.update({
      content: [
        `🎮 **Tic Tac Toe**`,
        `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
        ``,
        `${currentPlayer}'s turn (${nextSymbol})`,
        `⏱️ 60 seconds per move`,
      ].join("\n"),
      components: buildBoardButtons(gameId, board),
    });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const timeoutLoser = currentPlayer;
      const timeoutWinner = currentPlayer.id === xPlayer.id ? oPlayer : xPlayer;

      try {
        recordResult(timeoutWinner.id, timeoutLoser.id, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/tictactoe] failed to record timeout result");
      }

      await message.edit({
        content: [
          `🎮 **Tic Tac Toe**`,
          `❌ ${xPlayer} vs ⭕ ${oPlayer}`,
          ``,
          `⏱️ **${timeoutLoser} ran out of time!**`,
          `🎉 **${timeoutWinner} wins by timeout!**`,
        ].join("\n"),
        components: buildBoardButtons(gameId, board, true),
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Stats display                                                               */
/* -------------------------------------------------------------------------- */

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const stats = getStats(user.id);

  const lines = [
    `🎮 **Tic Tac Toe Stats for ${user}**`,
    "",
    `📊 **Overall**`,
    `Games: ${stats.total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
    `Win Rate: ${stats.winRate}%`,
  ];

  await interaction.editReply(lines.join("\n"));
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("opponent");

  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (opponent) {
    await playVsPlayer(interaction, opponent);
  } else {
    await playVsBot(interaction);
  }
}
