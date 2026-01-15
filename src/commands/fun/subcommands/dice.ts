import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

/**
 * Dice faces for a standard d6.
 * Used only when sides === 6.
 */
const D6_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const sides = interaction.options.getInteger("sides") ?? 6;
  const count = interaction.options.getInteger("count") ?? 1;

  const safeSides = Math.min(Math.max(sides, 2), 100);
  const safeCount = Math.min(Math.max(count, 1), 10);

  try {
    await rollAnimation(interaction, safeSides);

    const rolls: number[] = [];
    for (let i = 0; i < safeCount; i += 1) {
      rolls.push(Math.floor(Math.random() * safeSides) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0);

    const rollDisplay =
      safeSides === 6
        ? rolls.map((r) => D6_FACES[r - 1]).join(" ")
        : rolls.join(", ");

    const resultLines: string[] = [];

    resultLines.push(`🎲 **Dice Roll${safeCount > 1 ? "s" : ""}**`);
    resultLines.push(`Sides: d${safeSides}`);
    resultLines.push(`Rolls: ${rollDisplay}`);

    if (safeCount > 1) {
      resultLines.push(`Total: **${total}**`);
    }

    await interaction.editReply(resultLines.join("\n"));

    logger.debug(
      {
        userId: interaction.user.id,
        sides: safeSides,
        count: safeCount,
        rolls,
        total,
      },
      "[fun/dice] roll complete",
    );
  } catch (err) {
    logger.error({ err }, "[fun/dice] failed");
    await interaction.editReply("🎲 The dice fell off the table. Try again.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                ANIMATION                                   */
/* -------------------------------------------------------------------------- */

async function rollAnimation(
  interaction: ChatInputCommandInteraction,
  sides: number,
): Promise<void> {
  const frames = 8;

  for (let i = 0; i < frames; i += 1) {
    const frame =
      sides === 6
        ? D6_FACES[Math.floor(Math.random() * D6_FACES.length)]
        : Math.floor(Math.random() * sides) + 1;

    await interaction.editReply(`🎲 Rolling… ${frame}`);
    await sleep(120);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}