// src/commands/fun/subcommands/coinflipstats.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { getCoinFlipStats } from "../../../coinflipStore.js";

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function emoji(result: "heads" | "tails"): string {
  return result === "heads" ? "🟡" : "⚪";
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  const target = interaction.options.getUser("user") ?? interaction.user;

  try {
    const stats = getCoinFlipStats(target.id, 10);

    const lines: string[] = [];
    lines.push(`🪙 Coin Flip Stats for ${target.toString()}`);
    lines.push(`Total: ${stats.total}`);
    lines.push(
      `Heads: ${emoji("heads")} x${stats.heads} (${pct(stats.heads, stats.total)})`,
    );
    lines.push(
      `Tails: ${emoji("tails")} x${stats.tails} (${pct(stats.tails, stats.total)})`,
    );
    lines.push("");

    const recentEmojis = stats.recent.map((r) => emoji(r.result)).join(" ");
    lines.push(`Recent (${stats.recent.length}):`);
    lines.push(stats.recent.length ? recentEmojis : "None yet.");

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    getContextLogger().error(
      { err, userId: interaction.user.id, targetId: target.id },
      "[fun/coinflipstats] failed",
    );
    await interaction.editReply("Coin flip stats didn't load. Try again in a moment.");
  }
}
