// src/commands/fun/subcommands/stats.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import * as fetchers from "./fetchers.js";
import { buildStatsEmbed } from "./buildEmbed.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const db = getDb();

  const data = {
    rps: fetchers.getRPSStats(db, targetUser.id),
    trivia: fetchers.getTriviaStats(db, targetUser.id),
    daily: fetchers.getDailyStats(db, targetUser.id),
    ttt: fetchers.getTTTStats(db, targetUser.id),
    blackjack: fetchers.getBlackjackStats(db, targetUser.id),
    hangman: fetchers.getHangmanStats(db, targetUser.id),
    wordle: fetchers.getWordleStats(db, targetUser.id),
    slots: fetchers.getSlotsStats(db, targetUser.id),
    darts: fetchers.getDartsStats(db, targetUser.id),
    dartsPvp: fetchers.getDartsPvpStats(db, targetUser.id),
    coins: fetchers.getCoinStats(db, targetUser.id),
  };

  const embed = buildStatsEmbed(targetUser.username, targetUser.displayAvatarURL(), data);

  await interaction.editReply({ embeds: [embed] });
}
