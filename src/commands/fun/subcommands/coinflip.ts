// src/commands/fun/subcommands/coinflipstats.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getCoinFlipStats } from "../coinflipStore.js";

type FlipShort = "H" | "T";

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function short(r: "heads" | "tails"): FlipShort {
  return r === "heads" ? "H" : "T";
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  const target = interaction.options.getUser("user") ?? interaction.user;

  try {
    const stats = getCoinFlipStats({ userId: target.id, limit: 10 });

    const lines: string[] = [];
    lines.push(`🪙 Coin Flip Stats for ${target.toString()}`);
    lines.push(`Total: ${stats.total}`);
    lines.push(`Heads: ${stats.heads} (${pct(stats.heads, stats.total)})`);
    lines.push(`Tails: ${stats.tails} (${pct(stats.tails, stats.total)})`);
    lines.push("");
    lines.push(`Recent (${stats.recent.length}):`);
    lines.push(
      stats.recent.length
        ? stats.recent.map((r) => short(r.result)).join(" ")
        : "None yet.",
    );

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    logger.error(
      { err, userId: interaction.user.id, targetId: target.id },
      "[fun/coinflipstats] failed",
    );
    await interaction.editReply("Failed to load coin flip stats. Try again in a bit.");
  }
}
