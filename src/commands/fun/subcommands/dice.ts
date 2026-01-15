// src/commands/fun/subcommands/dice.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

/**
 * Dice faces for a standard d6.
 * Used only when sides === 6.
 */
const D6_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/**
 * /fun dice
 *
 * IMPORTANT:
 * - NOT a slash command by itself
 * - Must NOT call reply() or deferReply()
 * - Parent command owns the interaction lifecycle
 */
export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const sidesRaw = interaction.options.getInteger("sides") ?? 6;
  const countRaw = interaction.options.getInteger("count") ?? 1;

  // Clamp defensively (even though Discord option validation already exists)
  const sides = clampInt(sidesRaw, 2, 100);
  const count = clampInt(countRaw, 1, 10);

  try {
    await rollAnimation(interaction, sides);

    const rolls: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rolls.push(randomInt(1, sides));
    }

    const total = rolls.reduce((a, b) => a + b, 0);

    const renderedRolls =
      sides === 6
        ? rolls.map((r) => `${D6_FACES[r - 1]} (${r})`).join(", ")
        : rolls.map((r) => `${r}`).join(", ");

    // Keep output clean and consistent
    // - 1 die: show single result
    // - multiple dice: show list + total
    const text =
      count === 1
        ? `You rolled: ${sides === 6 ? `${D6_FACES[rolls[0] - 1]} (${rolls[0]})` : `${rolls[0]} (d${sides})`}`
        : `You rolled: ${renderedRolls}\nTotal: ${total}`;

    await interaction.editReply(text);

    logger.debug(
      { userId: interaction.user.id, sides, count, rolls, total },
      "[fun/dice] roll complete",
    );
  } catch (err) {
    logger.error({ err }, "[fun/dice] failed");
    await interaction.editReply("The dice fell off the table. Try again.");
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
        ? D6_FACES[randomInt(1, D6_FACES.length) - 1]
        : String(randomInt(1, sides));

    await interaction.editReply(`Rolling... ${frame}`);
    await sleep(120);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(minInclusive: number, maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
