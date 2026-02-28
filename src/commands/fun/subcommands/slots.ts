// src/commands/fun/subcommands/slots.ts
//
// Slot machine game with jackpots and leaderboard.
// Game logic in slots/gameLogic.ts, stats in slots/slotsStore.ts.

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { SLOTS_COOLDOWN_MS } from "../../../constants.js";
import { logger } from "../../../utils/logger.js";
import {
  checkSlotsCooldown,
  formatCooldownMessage,
  recordSlotsSpin,
} from "../../../services/discord/rateLimit.js";
import { SYMBOLS, TOTAL_WEIGHT, spinReel, calculatePayout } from "./slots/gameLogic.js";
import { getStats, getLeaderboard, recordSpin } from "./slots/slotsStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runSlots(interaction);
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[slots] handler failed");
    await interaction
      .editReply("Something went wrong with slots. Try again.")
      .catch(() => {});
  }
}

async function runSlots(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const showPaytable = interaction.options.getBoolean("paytable") ?? false;

  if (!showStatsFlag && !showLeaderboard && !showPaytable) {
    const remaining = checkSlotsCooldown(interaction.user.id);
    if (remaining > 0) {
      await interaction.editReply(
        formatCooldownMessage(
          remaining,
          SLOTS_COOLDOWN_MS / 1000,
          "slots",
          interaction.guild?.preferredLocale ?? null,
        ),
      );
      return;
    }
  }

  if (showPaytable) {
    const paytableLines = SYMBOLS.map(
      (s) =>
        `${s.emoji} ${s.name.padEnd(8)} - ${s.payout}x (${((s.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%)`,
    );
    await interaction.editReply(
      [
        "🎰 **Slots Paytable**",
        "",
        "Three of a kind payouts:",
        "```",
        ...paytableLines,
        "```",
        "",
        "Two matching symbols: 2x",
      ].join("\n"),
    );
    return;
  }

  if (showLeaderboard) {
    const leaders = getLeaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No jackpot winners yet! Be the first!");
      return;
    }
    const lines = leaders.map(
      (l, i) =>
        `${i + 1}. <@${l.user_id}> - ${l.jackpots} jackpot${l.jackpots === 1 ? "" : "s"}`,
    );
    await interaction.editReply(["🎰 **Jackpot Leaderboard**", "", ...lines].join("\n"));
    return;
  }

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    await interaction.editReply(
      [
        `🎰 **Slots Stats for ${interaction.user}**`,
        "",
        `Spins: ${stats.spins} | Wins: ${stats.wins} (${stats.winRate}%)`,
        `💎 Jackpots: ${stats.jackpots}`,
        stats.biggestWin ? `Biggest Win: ${stats.biggestWin}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  const userId = interaction.user.id;
  const reels: [
    ReturnType<typeof spinReel>,
    ReturnType<typeof spinReel>,
    ReturnType<typeof spinReel>,
  ] = [spinReel(), spinReel(), spinReel()];
  const { payout, type } = calculatePayout(reels);
  const isWin = payout > 0;
  const isJackpot = payout >= 100;

  logger.info({ userId, payout, isJackpot }, "[slots] spin");

  recordSpin(userId, isWin, isJackpot, payout);
  recordSlotsSpin(userId);

  const reelDisplay = reels.map((r) => r.emoji).join(" | ");

  const embed = new EmbedBuilder()
    .setTitle("🎰 Slot Machine")
    .setDescription(
      ["╔═══════════════╗", `║  ${reelDisplay}  ║`, "╚═══════════════╝"].join("\n"),
    )
    .setColor(isJackpot ? 0xffd700 : isWin ? 0x00ff00 : 0xff6b6b);

  if (isJackpot) {
    embed.addFields({
      name: "🎉 JACKPOT!",
      value: `You hit the **${payout}x** jackpot!`,
      inline: false,
    });
  } else if (isWin) {
    embed.addFields({
      name: "Winner!",
      value: `${type} - **${payout}x** payout!`,
      inline: false,
    });
  } else {
    embed.addFields({ name: "No luck this time", value: "Spin again!", inline: false });
  }

  embed.setFooter({ text: "Use /fun slots stats to see your record" });

  await interaction.editReply({ embeds: [embed] });
}
