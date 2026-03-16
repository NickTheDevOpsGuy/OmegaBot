import type { ChatInputCommandInteraction } from "discord.js";
import { DICE_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import {
  checkDiceCooldown,
  recordDiceRoll,
  formatCooldownMessage,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { getUserFacingReason } from "../../../../../../utils/errors.js";

/**
 * Dice faces for a standard d6.
 * Used only when sides === 6.
 */
const D6_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function formatOneRoll(sides: number, roll: number): string {
  // If the rolled value is between 1–6, show emoji + number
  if (roll >= 1 && roll <= 6) {
    const face = D6_FACES[roll - 1] ?? "🎲";
    return `${face} (${roll})`;
  }

  // Otherwise just show the number
  return `${roll}`;
}

async function rollAnimation(
  interaction: ChatInputCommandInteraction,
  sides: number,
  count: number,
): Promise<void> {
  const frames = 8;

  for (let i = 0; i < frames; i += 1) {
    let frameText = "";

    if (sides === 6) {
      // show a few random faces when rolling multiple dice
      const shown = Math.min(count, 5);
      const faces: string[] = [];
      for (let j = 0; j < shown; j += 1) {
        faces.push(D6_FACES[Math.floor(Math.random() * D6_FACES.length)] ?? "🎲");
      }
      frameText = faces.join(" ");
    } else {
      // show one changing number for non-d6
      frameText = String(rollDie(sides));
    }

    await interaction.editReply(`🎲 Rolling… ${frameText}`);
    await sleep(120);
  }
}

/** Parse dice notation: 2d6+3, 1d20, d6 → { count, sides, modifier }. */
function parseNotation(
  notation: string,
): { count: number; sides: number; modifier: number } | null {
  const trimmed = notation.trim().toLowerCase();
  const match = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  let modifier = 0;
  if (match[3]) {
    modifier = parseInt(match[3], 10);
  }
  if (count < 1 || count > 10 || sides < 2 || sides > 100) return null;
  return { count, sides, modifier };
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const remaining = checkDiceCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(
        remaining,
        DICE_COOLDOWN_MS / 1000,
        "dice",
        interaction.guild?.preferredLocale ?? null,
      ),
    );
    return;
  }

  const notationRaw = interaction.options.getString("notation");
  let sides: number;
  let count: number;
  let modifier = 0;

  if (notationRaw) {
    const parsed = parseNotation(notationRaw);
    if (!parsed) {
      await interaction.editReply(
        "Invalid notation. Use something like `2d6+3`, `1d20`, or `d6` (count 1–10, sides 2–100).",
      );
      return;
    }
    sides = parsed.sides;
    count = parsed.count;
    modifier = parsed.modifier;
  } else {
    const sidesRaw = interaction.options.getInteger("sides") ?? 6;
    const countRaw = interaction.options.getInteger("count") ?? 1;
    sides = clampInt(sidesRaw, 2, 100);
    count = clampInt(countRaw, 1, 10);
  }

  try {
    await rollAnimation(interaction, sides, count);
    recordDiceRoll(interaction.user.id);

    const rolls: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rolls.push(rollDie(sides));
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    const display = rolls.map((r) => formatOneRoll(sides, r)).join(", ");

    const lines: string[] = [];
    if (modifier !== 0) {
      lines.push(
        `You rolled: ${display} ${modifier >= 0 ? "+" : ""} ${modifier} = **${total}**`,
      );
    } else {
      lines.push(`You rolled (d${sides}): ${display}`);
      if (count > 1) {
        lines.push(`Total: **${total}**`);
      }
    }

    await interaction.editReply(lines.join("\n"));

    getContextLogger().info(
      { userId: interaction.user.id, sides, count, modifier, rolls, total },
      "[dice] roll complete",
    );
  } catch (err) {
    getContextLogger().error({ err }, "[fun/dice] dice handler threw");
    await interaction.editReply(`🎲 ${getUserFacingReason(err)}`);
  }
}
