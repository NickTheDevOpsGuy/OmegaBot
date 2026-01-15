import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const frames = ["|", "/", "-", "\\", "|", "/", "-", "\\"];

  for (const f of frames) {
    await interaction.editReply(`🪙 Flipping ${f}`);
    await sleep(120);
  }

  await interaction.editReply("🪙 Tossed…");
  await sleep(250);

  const isHeads = Math.random() < 0.5;

  const result = isHeads
    ? "🟡 **HEADS**"
    : "⚪ **TAILS**";

  await interaction.editReply(`🪙 ${result}`);

  logger.debug(
    {
      userId: interaction.user.id,
      result: isHeads ? "heads" : "tails",
    },
    "[fun/coinflip] result",
  );
}