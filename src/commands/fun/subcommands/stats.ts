// src/commands/fun/subcommands/stats.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Stat Fetchers                                                               */
/* -------------------------------------------------------------------------- */

function safeQuery<T>(query: () => T | undefined): T | null {
  try {
    return query() ?? null;
  } catch {
    return null;
  }
}

type RPSRow = { wins: number; losses: number; ties: number };
type TriviaRow = {
  correct: number;
  incorrect: number;
  points: number;
  best_streak: number;
};
type DailyRow = {
  streak: number;
  best_streak: number;
  total_checkins: number;
  points: number;
};
type TTTRow = { wins: number; losses: number; ties: number };
type BlackjackRow = { wins: number; losses: number; ties: number; blackjacks: number };
type HangmanRow = { wins: number; losses: number; total_guesses: number };
type WordleRow = {
  played: number;
  won: number;
  current_streak: number;
  max_streak: number;
};
type SlotsRow = { spins: number; wins: number; jackpots: number };
type CoinRow = { heads: number; tails: number };

function getRPSStats(db: ReturnType<typeof getDb>, userId: string): RPSRow | null {
  return safeQuery(
    () =>
      db
        .prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`)
        .get(userId) as RPSRow,
  );
}

function getTriviaStats(db: ReturnType<typeof getDb>, userId: string): TriviaRow | null {
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT correct, incorrect, points, best_streak FROM trivia_stats WHERE user_id = ?`,
        )
        .get(userId) as TriviaRow,
  );
}

function getDailyStats(db: ReturnType<typeof getDb>, userId: string): DailyRow | null {
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT streak, best_streak, total_checkins, points FROM daily_checkins WHERE user_id = ?`,
        )
        .get(userId) as DailyRow,
  );
}

function getTTTStats(db: ReturnType<typeof getDb>, userId: string): TTTRow | null {
  return safeQuery(
    () =>
      db
        .prepare(`SELECT wins, losses, ties FROM ttt_stats WHERE user_id = ?`)
        .get(userId) as TTTRow,
  );
}

function getBlackjackStats(
  db: ReturnType<typeof getDb>,
  userId: string,
): BlackjackRow | null {
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT wins, losses, ties, blackjacks FROM blackjack_stats WHERE user_id = ?`,
        )
        .get(userId) as BlackjackRow,
  );
}

function getHangmanStats(
  db: ReturnType<typeof getDb>,
  userId: string,
): HangmanRow | null {
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT wins, losses, total_guesses FROM hangman_stats WHERE user_id = ?`,
        )
        .get(userId) as HangmanRow,
  );
}

function getWordleStats(db: ReturnType<typeof getDb>, userId: string): WordleRow | null {
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT played, won, current_streak, max_streak FROM wordle_stats WHERE user_id = ?`,
        )
        .get(userId) as WordleRow,
  );
}

function getSlotsStats(db: ReturnType<typeof getDb>, userId: string): SlotsRow | null {
  return safeQuery(
    () =>
      db
        .prepare(`SELECT spins, wins, jackpots FROM slots_stats WHERE user_id = ?`)
        .get(userId) as SlotsRow,
  );
}

function getCoinStats(db: ReturnType<typeof getDb>, userId: string): CoinRow | null {
  return safeQuery(() => {
    const heads = db
      .prepare(
        `SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ? AND result = 'heads'`,
      )
      .get(userId) as { count: number };
    const tails = db
      .prepare(
        `SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ? AND result = 'tails'`,
      )
      .get(userId) as { count: number };
    return { heads: heads.count, tails: tails.count };
  });
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const db = getDb();

  const rps = getRPSStats(db, targetUser.id);
  const trivia = getTriviaStats(db, targetUser.id);
  const daily = getDailyStats(db, targetUser.id);
  const ttt = getTTTStats(db, targetUser.id);
  const blackjack = getBlackjackStats(db, targetUser.id);
  const hangman = getHangmanStats(db, targetUser.id);
  const wordle = getWordleStats(db, targetUser.id);
  const slots = getSlotsStats(db, targetUser.id);
  const coins = getCoinStats(db, targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`📊 Stats for ${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setColor(0x5865f2);

  // Games Section
  const gameLines: string[] = [];

  if (rps) {
    const total = rps.wins + rps.losses + rps.ties;
    const winRate = total > 0 ? Math.round((rps.wins / total) * 100) : 0;
    gameLines.push(`🪨 **RPS:** ${rps.wins}W/${rps.losses}L/${rps.ties}T (${winRate}%)`);
  }

  if (ttt) {
    const total = ttt.wins + ttt.losses + ttt.ties;
    const winRate = total > 0 ? Math.round((ttt.wins / total) * 100) : 0;
    gameLines.push(
      `⭕ **Tic-Tac-Toe:** ${ttt.wins}W/${ttt.losses}L/${ttt.ties}T (${winRate}%)`,
    );
  }

  if (blackjack) {
    const total = blackjack.wins + blackjack.losses + blackjack.ties;
    const winRate = total > 0 ? Math.round((blackjack.wins / total) * 100) : 0;
    gameLines.push(
      `🃏 **Blackjack:** ${blackjack.wins}W/${blackjack.losses}L (${winRate}%) | 🎰 ${blackjack.blackjacks}`,
    );
  }

  if (hangman) {
    const total = hangman.wins + hangman.losses;
    const winRate = total > 0 ? Math.round((hangman.wins / total) * 100) : 0;
    gameLines.push(`🎯 **Hangman:** ${hangman.wins}W/${hangman.losses}L (${winRate}%)`);
  }

  if (wordle) {
    const winRate =
      wordle.played > 0 ? Math.round((wordle.won / wordle.played) * 100) : 0;
    gameLines.push(
      `🟩 **Wordle:** ${wordle.won}/${wordle.played} (${winRate}%) | 🔥 ${wordle.current_streak}`,
    );
  }

  if (gameLines.length > 0) {
    embed.addFields({ name: "🎮 Games", value: gameLines.join("\n"), inline: false });
  }

  // Slots & Coins
  const funLines: string[] = [];

  if (slots) {
    const winRate = slots.spins > 0 ? Math.round((slots.wins / slots.spins) * 100) : 0;
    funLines.push(
      `🎰 **Slots:** ${slots.spins} spins, ${slots.wins} wins (${winRate}%) | 💎 ${slots.jackpots} jackpots`,
    );
  }

  if (coins && (coins.heads > 0 || coins.tails > 0)) {
    const total = coins.heads + coins.tails;
    funLines.push(`🪙 **Coins:** ${total} flips (${coins.heads}H / ${coins.tails}T)`);
  }

  if (funLines.length > 0) {
    embed.addFields({ name: "🎲 Luck Games", value: funLines.join("\n"), inline: false });
  }

  // Trivia
  if (trivia) {
    const total = trivia.correct + trivia.incorrect;
    const accuracy = total > 0 ? Math.round((trivia.correct / total) * 100) : 0;
    embed.addFields({
      name: "🧠 Trivia",
      value: `${trivia.correct}/${total} correct (${accuracy}%) | ${trivia.points} pts | Best: ${trivia.best_streak}🔥`,
      inline: false,
    });
  }

  // Daily
  if (daily) {
    embed.addFields({
      name: "📅 Daily Check-ins",
      value: `${daily.total_checkins} total | ${daily.points} pts | Current: ${daily.streak}🔥 | Best: ${daily.best_streak}🔥`,
      inline: false,
    });
  }

  // No stats at all
  if (
    !rps &&
    !trivia &&
    !daily &&
    !ttt &&
    !blackjack &&
    !hangman &&
    !wordle &&
    !slots &&
    !coins
  ) {
    embed.setDescription("No stats yet! Start playing some games!");
  }

  await interaction.editReply({ embeds: [embed] });
}
