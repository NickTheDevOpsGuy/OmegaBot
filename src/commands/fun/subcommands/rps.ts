// src/commands/fun/subcommands/rps.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

type Choice = "rock" | "paper" | "scissors";
type Result = "win" | "lose" | "tie";

const CHOICES: Choice[] = ["rock", "paper", "scissors"];

const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const WINS_AGAINST: Record<Choice, Choice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

function getBotChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getResult(player: Choice, bot: Choice): Result {
  if (player === bot) return "tie";
  if (WINS_AGAINST[player] === bot) return "win";
  return "lose";
}

function getResultEmoji(result: Result): string {
  switch (result) {
    case "win":
      return "🎉";
    case "lose":
      return "😢";
    case "tie":
      return "🤝";
  }
}

function getResultText(result: Result): string {
  switch (result) {
    case "win":
      return "You win!";
    case "lose":
      return "You lose!";
    case "tie":
      return "It's a tie!";
  }
}

/* -------------------------------------------------------------------------- */
/* Stats tracking                                                              */
/* -------------------------------------------------------------------------- */

function ensureRpsTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

function recordResult(userId: string, result: Result): void {
  ensureRpsTable();
  const db = getDb();
  const now = Date.now();

  const column = result === "win" ? "wins" : result === "lose" ? "losses" : "ties";

  db.prepare(
    `
    INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ${column} = ${column} + 1,
      updated_at = ?
  `,
  ).run(
    userId,
    result === "win" ? 1 : 0,
    result === "lose" ? 1 : 0,
    result === "tie" ? 1 : 0,
    now,
    now,
  );
}

type RpsStats = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
};

function getStats(userId: string): RpsStats {
  ensureRpsTable();
  const db = getDb();

  type StatsRow = {
    wins: number;
    losses: number;
    ties: number;
  };

  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`)
    .get(userId) as StatsRow | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return {
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    total,
    winRate,
  };
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const choiceInput = interaction.options.getString("choice", true).toLowerCase();
  const showStats = interaction.options.getBoolean("stats") ?? false;

  // Handle stats request
  if (showStats) {
    const stats = getStats(interaction.user.id);
    const lines: string[] = [];
    lines.push(`✊✋✌️ **RPS Stats for ${interaction.user.toString()}**`);
    lines.push("");
    lines.push(`Total Games: ${stats.total}`);
    lines.push(`Wins: ${stats.wins} 🎉`);
    lines.push(`Losses: ${stats.losses} 😢`);
    lines.push(`Ties: ${stats.ties} 🤝`);
    lines.push(`Win Rate: ${stats.winRate}%`);

    await interaction.editReply(lines.join("\n"));
    return;
  }

  // Validate choice
  if (!CHOICES.includes(choiceInput as Choice)) {
    await interaction.editReply("Invalid choice! Pick `rock`, `paper`, or `scissors`.");
    return;
  }

  const playerChoice = choiceInput as Choice;

  try {
    const botChoice = getBotChoice();
    const result = getResult(playerChoice, botChoice);

    // Record the result
    recordResult(interaction.user.id, result);

    const lines: string[] = [];
    lines.push(`${EMOJI[playerChoice]} **You** vs **Bot** ${EMOJI[botChoice]}`);
    lines.push("");
    lines.push(`${getResultEmoji(result)} **${getResultText(result)}**`);

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[fun/rps] failed");
    await interaction.editReply("Something went wrong. Try again!");
  }
}
