// src/commands/fun/subcommands/coinflip.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { recordCoinFlip, type CoinFlipResult } from "../coinflipStore.js";

/**
 * Small async sleep helper used for animation timing.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * /fun coinflip
 *
 * Behavior:
 * - Performs a short animated coin flip sequence
 * - Randomly resolves to heads or tails
 * - Persists the result per-user in SQLite
 *
 * Persistence guarantees:
 * - Each flip is recorded immediately after resolution
 * - Data survives bot restarts
 * - Stored data powers:
 *     • /fun coinstats (personal stats)
 *     • /fun coinstats leaderboard
 *     • /fun coinstats user:<user>
 *
 * Important design notes:
 * - Parent command (fun.ts) owns deferReply()
 * - This handler ONLY uses editReply()
 * - Storage failures must never break the command UX
 */
export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  /* ------------------------------------------------------------------ */
  /* Flip animation                                                      */
  /* ------------------------------------------------------------------ */

  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];
  for (const frame of frames) {
    await interaction.editReply(`🪙 Flipping ${frame}`);
    await sleep(140);
  }

  // Small pause before reveal
  await interaction.editReply("🪙 Tossed…");
  await sleep(260);

  /* ------------------------------------------------------------------ */
  /* Resolve result                                                      */
  /* ------------------------------------------------------------------ */

  const isHeads = Math.random() < 0.5;
  const result: CoinFlipResult = isHeads ? "heads" : "tails";

  /* ------------------------------------------------------------------ */
  /* Persist result                                                      */
  /* ------------------------------------------------------------------ */

  try {
    recordCoinFlip({
      userId: interaction.user.id,
      result,
    });
  } catch (err) {
    /**
     * Storage failures are non-fatal.
     *
     * The user should still see the coin flip result even if:
     * - SQLite is locked
     * - Disk is full
     * - Schema is temporarily unavailable
     */
    logger.warn({ err }, "[fun/coinflip] failed to record coin flip");
  }

  /* ------------------------------------------------------------------ */
  /* Final response                                                      */
  /* ------------------------------------------------------------------ */

  const display = isHeads ? "🟡 **HEADS**" : "⚪ **TAILS**";
  await interaction.editReply(display);

  logger.debug(
    {
      userId: interaction.user.id,
      result,
    },
    "[fun/coinflip] result sent",
  );
}
