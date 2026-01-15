import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // Parent (fun.ts) owns deferReply(). We only editReply() here.

  // Simple spinning animation
  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];
  for (const f of frames) {
    await interaction.editReply(`🪙 Flipping ${f}`);
    await sleep(140);
  }

  // Small pause before reveal
  await interaction.editReply("🪙 Tossed…");
  await sleep(260);

  const isHeads = Math.random() < 0.5;

  // Clean final result (no duplicate coin emoji)
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