// src/commands/fun/subcommands/coinflip.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];
  for (const f of frames) {
    await interaction.editReply(`🪙 Flipping ${f}`);
    await sleep(140);
  }

  // A little “in the air” moment helps the brain read this as motion
  await interaction.editReply("🪙 Tossed…");
  await sleep(260);

  const isHeads = Math.random() < 0.5;

  // Make the two results visually distinct
  const result = isHeads ? "🟡 **HEADS**  👑" : "⚪ **TAILS**  🌀";

  await interaction.editReply(`${result}`);

  logger.debug(
    { userId: interaction.user.id, result: isHeads ? "heads" : "tails" },
    "[fun/coinflip] result sent",
  );
}
