// src/commands/fun/subcommands/coinflip.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply()

  // Toss
  await interaction.editReply("🪙 Flipping the coin...");
  await sleep(300);

  // Airtime
  await interaction.editReply("🪙 The coin is in the air");
  await sleep(350);

  // Suspense beat
  await interaction.editReply("🪙 It lands...");
  await sleep(300);

  const isHeads = Math.random() < 0.5;

  const result = isHeads ? "🟡 **HEADS**" : "⚪ **TAILS**";

  await interaction.editReply(result);

  logger.debug(
    {
      userId: interaction.user.id,
      result: isHeads ? "heads" : "tails",
    },
    "[fun/coinflip] result sent",
  );
}
