// src/commands/fun/subcommands/coinflip.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordCoinFlip, type CoinFlipResult } from "../../../coinflipStore.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];
  for (const f of frames) {
    await interaction.editReply(`🪙 Flipping ${f}`);
    await sleep(140);
  }

  await interaction.editReply("🪙 Tossed…");
  await sleep(260);

  const isHeads = Math.random() < 0.5;
  const stored: CoinFlipResult = isHeads ? "heads" : "tails";

  try {
    const rowId = recordCoinFlip({ userId: interaction.user.id, result: stored });
    logger.info(
      { userId: interaction.user.id, result: stored, rowId },
      "[fun/coinflip] recorded",
    );
  } catch (err) {
    // Do NOT hide this. If stats are wrong, this is usually why.
    logger.error(
      { err, userId: interaction.user.id, result: stored },
      "[fun/coinflip] failed to record coin flip",
    );
  }

  await interaction.editReply(isHeads ? "🟡 **HEADS**" : "⚪ **TAILS**");
}
