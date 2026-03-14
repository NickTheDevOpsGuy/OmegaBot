// src/commands/fun/subcommands/stats/buildEmbed.ts
// Build the stats embed from fetcher results.

import { EmbedBuilder } from "discord.js";
import type {
  RPSRow,
  TriviaRow,
  DailyRow,
  TTTRow,
  BlackjackRow,
  HangmanRow,
  WordleRow,
  SlotsRow,
  DartsRow,
  DartsPvpRow,
  CoinRow,
  ProgressionRow,
} from "./fetchers.js";
import {
  buildProgressBar,
  getLevelFromXp,
} from "../../../../../../services/stores/progression/progressionStore.js";

export type StatsData = {
  rps: RPSRow | null;
  trivia: TriviaRow | null;
  daily: DailyRow | null;
  ttt: TTTRow | null;
  blackjack: BlackjackRow | null;
  hangman: HangmanRow | null;
  wordle: WordleRow | null;
  slots: SlotsRow | null;
  darts: DartsRow | null;
  dartsPvp: DartsPvpRow | null;
  coins: CoinRow | null;
  progression: ProgressionRow | null;
};

export function buildStatsEmbed(
  username: string,
  avatarURL: string,
  data: StatsData,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`📊 Stats for ${username}`)
    .setThumbnail(avatarURL)
    .setColor(0x5865f2);

  if (data.progression) {
    const level = getLevelFromXp(data.progression.xp);
    const currentFloor =
      level <= 1
        ? 0
        : (() => {
            let total = 0;
            for (let current = 1; current < level; current += 1)
              total += 100 + (current - 1) * 50;
            return total;
          })();
    const nextFloor = (() => {
      let total = 0;
      for (let current = 1; current <= level; current += 1)
        total += 100 + (current - 1) * 50;
      return total;
    })();
    const intoLevel = data.progression.xp - currentFloor;
    const forNext = nextFloor - currentFloor;
    embed.addFields({
      name: "✨ Progression",
      value: [
        `Level **${level}**`,
        `XP: **${data.progression.xp}**`,
        `[${buildProgressBar(intoLevel, forNext)}] ${intoLevel}/${forNext}`,
      ].join("\n"),
      inline: false,
    });
  }

  const gameLines: string[] = [];

  if (data.rps) {
    const total = data.rps.wins + data.rps.losses + data.rps.ties;
    const winRate = total > 0 ? Math.round((data.rps.wins / total) * 100) : 0;
    gameLines.push(
      `🪨 **RPS:** ${data.rps.wins}W/${data.rps.losses}L/${data.rps.ties}T (${winRate}%)`,
    );
  }

  if (data.ttt) {
    const total = data.ttt.wins + data.ttt.losses + data.ttt.ties;
    const winRate = total > 0 ? Math.round((data.ttt.wins / total) * 100) : 0;
    gameLines.push(
      `⭕ **Tic-Tac-Toe:** ${data.ttt.wins}W/${data.ttt.losses}L/${data.ttt.ties}T (${winRate}%)`,
    );
  }

  if (data.blackjack) {
    const total = data.blackjack.wins + data.blackjack.losses + data.blackjack.ties;
    const winRate = total > 0 ? Math.round((data.blackjack.wins / total) * 100) : 0;
    gameLines.push(
      `🃏 **Blackjack:** ${data.blackjack.wins}W/${data.blackjack.losses}L (${winRate}%) | 🎰 ${data.blackjack.blackjacks}`,
    );
  }

  if (data.hangman) {
    const total = data.hangman.wins + data.hangman.losses;
    const winRate = total > 0 ? Math.round((data.hangman.wins / total) * 100) : 0;
    gameLines.push(
      `🎯 **Hangman:** ${data.hangman.wins}W/${data.hangman.losses}L (${winRate}%)`,
    );
  }

  if (data.wordle) {
    const winRate =
      data.wordle.played > 0
        ? Math.round((data.wordle.won / data.wordle.played) * 100)
        : 0;
    gameLines.push(
      `🟩 **Wordle:** ${data.wordle.won}/${data.wordle.played} (${winRate}%) | 🔥 ${data.wordle.current_streak}`,
    );
  }

  if (gameLines.length > 0) {
    embed.addFields({ name: "🎮 Games", value: gameLines.join("\n"), inline: false });
  }

  const funLines: string[] = [];

  if (data.slots) {
    const winRate =
      data.slots.spins > 0 ? Math.round((data.slots.wins / data.slots.spins) * 100) : 0;
    funLines.push(
      `🎰 **Slots:** ${data.slots.spins} spins, ${data.slots.wins} wins (${winRate}%) | 💎 ${data.slots.jackpots} jackpots`,
    );
  }

  if (data.darts && data.darts.throws > 0) {
    const pvpPart =
      data.dartsPvp && data.dartsPvp.wins + data.dartsPvp.losses + data.dartsPvp.ties > 0
        ? ` | PvP: ${data.dartsPvp.wins}W/${data.dartsPvp.losses}L/${data.dartsPvp.ties}T`
        : "";
    funLines.push(
      `🎯 **Darts:** ${data.darts.throws} throws, best ${data.darts.best_round} | 🔥 ${data.darts.count_180} 180s${pvpPart}`,
    );
  }

  if (data.coins && (data.coins.heads > 0 || data.coins.tails > 0)) {
    const total = data.coins.heads + data.coins.tails;
    funLines.push(
      `🪙 **Coins:** ${total} flips (${data.coins.heads}H / ${data.coins.tails}T)`,
    );
  }

  if (funLines.length > 0) {
    embed.addFields({ name: "🎲 Luck Games", value: funLines.join("\n"), inline: false });
  }

  if (data.trivia) {
    const total = data.trivia.correct + data.trivia.incorrect;
    const accuracy = total > 0 ? Math.round((data.trivia.correct / total) * 100) : 0;
    embed.addFields({
      name: "🧠 Trivia",
      value: `${data.trivia.correct}/${total} correct (${accuracy}%) | ${data.trivia.points} pts | Best: ${data.trivia.best_streak}🔥`,
      inline: false,
    });
  }

  if (data.daily) {
    embed.addFields({
      name: "📅 Daily Check-ins",
      value: `${data.daily.total_checkins} total | ${data.daily.points} pts | Current: ${data.daily.streak}🔥 | Best: ${data.daily.best_streak}🔥`,
      inline: false,
    });
  }

  const hasAny =
    data.rps ||
    data.trivia ||
    data.daily ||
    data.ttt ||
    data.blackjack ||
    data.hangman ||
    data.wordle ||
    data.slots ||
    data.darts ||
    data.coins ||
    data.progression;

  if (!hasAny) {
    embed.setDescription("No stats yet! Start playing some games!");
  } else {
    embed.setFooter({
      text: "See how you rank: /fun utility leaderboard",
    });
  }

  return embed;
}
