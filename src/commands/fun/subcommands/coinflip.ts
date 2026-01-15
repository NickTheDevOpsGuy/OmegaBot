// src/commands/fun/subcommands/dice.ts

import { randomInt } from "node:crypto";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

type RollResult = {
  sides: number;
  count: number;
  rolls: number[];
  total: number;
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function rollDice(args: { sides: number; count: number }): RollResult {
  const sides = clampInt(args.sides, 2, 100);
  const count = clampInt(args.count, 1, 10);

  const rolls: number[] = [];
  for (let i = 0; i < count; i += 1) {
    // randomInt(min, maxExclusive) => [1..sides]
    rolls.push(randomInt(1, sides + 1));
  }

  const total = rolls.reduce((a, b) => a + b, 0);

  return { sides, count, rolls, total };
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  // IMPORTANT: option names must match fun.ts:
  // .setName("sides") and .setName("count")
  const sidesRaw = interaction.options.getInteger("sides");
  const countRaw = interaction.options.getInteger("count");

  const sides = sidesRaw ?? 6;
  const count = countRaw ?? 1;

  const result = rollDice({ sides, count });

  const embed = new EmbedBuilder().setTitle("Fun: Dice");

  const rollLabel = `${result.count}d${result.sides}`;
  const rollsText = result.rolls.join(", ");

  // Keep it readable even for 10 rolls
  const lines: string[] = [];
  lines.push(`Roll: \`${rollLabel}\``);
  lines.push(`Results: ${rollsText}`);

  if (result.count > 1) {
    const avg = result.total / result.count;
    lines.push(`Total: ${result.total}`);
    lines.push(`Average: ${avg.toFixed(2)}`);
  } else {
    lines.push(`Total: ${result.total}`);
  }

  embed.setDescription(lines.join("\n"));

  await interaction.editReply({ embeds: [embed] });
}
