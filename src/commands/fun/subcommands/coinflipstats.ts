// src/commands/fun/subcommands/coinflipstats.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getCoinFlipStats } from "../coinflipStore.js";

const HEADS_EMOJI = "🟡";
const TAILS_EMOJI = "⚪";

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function short(r: "heads" | "tails"): string {
  return r === "heads" ? "H" : "T";
}

function emojiBar(emoji: string, count: number): string {
  if (count <= 0) return "—";
  return emoji.repeat(Math.min(count, 20));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.
  const target = interaction.options.getUser("user") ?? interaction.user;

  try {
    const stats = getCoinFlipStats({ userId: target.id, limit: 10 });

    const lines: string[] = [];
    lines.push(`🪙 Coin Flip Stats for ${target.toString()}`);
    lines.push(`Total: ${stats.total}`);
    lines.push(
      `${HEADS_EMOJI} Heads: ${stats.heads} (${pct(stats.heads, stats.total)})`,
    );
    lines.push(
      `${TAILS_EMOJI} Tails: ${stats.tails} (${pct(stats.tails, stats.total)})`,
    );
    lines.push("");
    lines.push(`${HEADS_EMOJI} ${emojiBar(HEADS_EMOJI, stats.heads)}`);
    lines.push(`${TAILS_EMOJI} ${emojiBar(TAILS_EMOJI, stats.tails)}`);
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
