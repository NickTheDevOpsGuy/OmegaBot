import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

/**
 * Dice faces for a standard d6.
 * Used only when sides === 6.
 */
const D6_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/**
 * Run handler for /fun dice
 *
 * IMPORTANT:
 * - NOT a slash command by itself
 * - Must NOT call reply() or deferReply()
 * - Parent command owns the interaction lifecycle
 */
export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const sides = interaction.options.getInteger("sides") ?? 6;

  try {
    // Clamp just in case Discord validation ever changes
    const safeSides = Math.min(Math.max(sides, 2), 100);

    await rollAnimation(interaction, safeSides);

    const roll = Math.floor(Math.random() * safeSides) + 1;

    const result =
      safeSides === 6
        ? `🎲 **You rolled:** ${D6_FACES[roll - 1]} (${roll})`
        : `🎲 **You rolled:** ${roll} (d${safeSides})`;

    await interaction.editReply(result);

    logger.debug(
      {
        userId: interaction.user.id,
        sides: safeSides,
        roll,
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

  for (let i = 0; i < frames; i++) {
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
