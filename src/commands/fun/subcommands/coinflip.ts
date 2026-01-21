// src/commands/fun/subcommands/coinflip.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { recordCoinFlip } from "../coinflipStore.js";

type CoinFlipResult = "heads" | "tails";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent command already deferred the reply
  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];

  try {
    for (const f of frames) {
      await interaction.editReply(`🪙 Flipping ${f}`);
      await sleep(120);
    }

    await interaction.editReply("🪙 Tossed…");
    await sleep(200);

    const isHeads = Math.random() < 0.5;
    const result: CoinFlipResult = isHeads ? "heads" : "tails";

    // Persist result (best effort)
    try {
      recordCoinFlip({
        userId: interaction.user.id,
        result,
      });
    } catch (err) {
      logger.warn({ err }, "[fun/coinflip] failed to record coin flip");
    }

    await interaction.editReply(result === "heads" ? "🟡 **HEADS**" : "⚪ **TAILS**");

    logger.debug({ userId: interaction.user.id, result }, "[fun/coinflip] delivered");
  } catch (err) {
    logger.error({ err }, "[fun/coinflip] execution failed");
    await interaction.editReply("Coin flip failed. Try again.");
  }
}
