// src/commands/fun/subcommands/coinflipstats.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getCoinFlipTotals, getRecentCoinFlips } from "../coinflipStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  const user = interaction.options.getUser("user") ?? interaction.user;
  const limitRaw = interaction.options.getInteger("limit") ?? 10;
  const limit = Math.min(Math.max(limitRaw, 1), 25);
  const includeRecent = interaction.options.getBoolean("recent") ?? true;

  try {
    const totals = getCoinFlipTotals(user.id);

    const pctHeads =
      totals.total > 0 ? Math.round((totals.heads / totals.total) * 100) : 0;
    const pctTails =
      totals.total > 0 ? Math.round((totals.tails / totals.total) * 100) : 0;

    let content =
      `🪙 **Coin Flip Stats** for <@${user.id}>\n` +
      `Total: **${totals.total}**\n` +
      `Heads: **${totals.heads}** (${pctHeads}%)\n` +
      `Tails: **${totals.tails}** (${pctTails}%)`;

    if (includeRecent) {
      const recents = getRecentCoinFlips(user.id, limit);
      if (recents.length > 0) {
        const line = recents.map((r) => (r.result === "heads" ? "H" : "T")).join(" ");
        content += `\n\nRecent (${recents.length}):\n\`${line}\``;
      } else {
        content += `\n\nNo flips recorded yet. Try \`/fun coinflip\`.`;
      }
    }

    await interaction.editReply(content);

    logger.info(
      { requester: interaction.user.id, target: user.id, totals },
      "[fun/coinflipstats] stats sent",
    );
  } catch (err) {
    logger.error({ err }, "[fun/coinflipstats] failed");
    await interaction.editReply("Failed to load coin flip stats. Try again in a bit.");
  }
}
