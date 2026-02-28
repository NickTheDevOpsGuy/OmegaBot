// src/commands/fun/subcommands/darts/solo.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { DARTS_COOLDOWN_MS } from "../../../../constants.js";
import { logger } from "../../../../utils/logger.js";
import {
  checkDartsCooldown,
  formatCooldownMessage,
  recordDartsThrow,
} from "../../../../services/discord/rateLimit.js";
import { recordSoloThrow } from "../dartsStore.js";
import { DARTBOARD_ART, doThrow, formatThrowLines } from "./gameLogic.js";

export async function runSoloThrow(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const remaining = checkDartsCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(
        remaining,
        DARTS_COOLDOWN_MS / 1000,
        "darts",
        interaction.guild?.preferredLocale ?? null,
      ),
    );
    return;
  }

  const { hits, score, is180 } = doThrow();
  recordDartsThrow(interaction.user.id);
  recordSoloThrow(interaction.user.id, score, is180);

  const lines = ["🎯 **Darts**", "", DARTBOARD_ART, "", ...formatThrowLines(hits, score)];

  await interaction.editReply(lines.join("\n"));

  logger.info(
    { userId: interaction.user.id, hits: hits.map((h) => h.value), score },
    "[darts] solo throw complete",
  );
}
