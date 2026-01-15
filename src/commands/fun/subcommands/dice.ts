// src/commands/fun/subcommands/dice.ts

import { randomInt } from "node:crypto";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

type DiceSpec = {
  count: number;
  sides: number;
  modifier: number;
  source: "notation" | "options";
};

type ParseResult = { ok: true; spec: DiceSpec } | { ok: false; message: string };

const DEFAULT_COUNT = 1;
const DEFAULT_SIDES = 6;

const MIN_COUNT = 1;
const MAX_COUNT = 10;

const MIN_SIDES = 2;
const MAX_SIDES = 100;

const MIN_MOD = -1000;
const MAX_MOD = 1000;

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function rollDie(sides: number): number {
  // randomInt is [min, max) so use 1..sides+1
  return randomInt(1, sides + 1);
}

function parseNotation(raw: string): ParseResult {
  // Supports: "10d6", "2d20+5", "4d8-1"
  const cleaned = raw.trim().toLowerCase();

  const m = /^(\d{1,3})d(\d{1,3})([+-]\d{1,5})?$/.exec(cleaned);
  if (!m) {
    return {
      ok: false,
      message:
        "Invalid notation. Try `10d6`, `2d20+5`, or use `count` + `sides` options.",
    };
  }

  const countRaw = Number(m[1]);
  const sidesRaw = Number(m[2]);
  const modRaw = m[3] ? Number(m[3]) : 0;

  const count = clampInt(countRaw, MIN_COUNT, MAX_COUNT);
  const sides = clampInt(sidesRaw, MIN_SIDES, MAX_SIDES);
  const modifier = clampInt(modRaw, MIN_MOD, MAX_MOD);

  return {
    ok: true,
    spec: { count, sides, modifier, source: "notation" },
  };
}

function resolveDiceSpec(interaction: ChatInputCommandInteraction): ParseResult {
  const notation = interaction.options.getString("notation")?.trim() ?? "";

  if (notation.length > 0) {
    return parseNotation(notation);
  }

  const countOpt = interaction.options.getInteger("count") ?? DEFAULT_COUNT;
  const sidesOpt = interaction.options.getInteger("sides") ?? DEFAULT_SIDES;

  const count = clampInt(countOpt, MIN_COUNT, MAX_COUNT);
  const sides = clampInt(sidesOpt, MIN_SIDES, MAX_SIDES);

  return {
    ok: true,
    spec: { count, sides, modifier: 0, source: "options" },
  };
}

function formatSpec(spec: DiceSpec): string {
  const base = `${spec.count}d${spec.sides}`;
  if (spec.modifier === 0) return base;
  return spec.modifier > 0 ? `${base}+${spec.modifier}` : `${base}${spec.modifier}`;
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const resolved = resolveDiceSpec(interaction);

  if (!resolved.ok) {
    await interaction.editReply(resolved.message);
    return;
  }

  const spec = resolved.spec;

  const rolls: number[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    rolls.push(rollDie(spec.sides));
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + spec.modifier;

  const specText = formatSpec(spec);

  // Keep output readable
  const showRolls = spec.count <= 10;
  const rollsText = showRolls ? rolls.join(", ") : "(hidden)";

  const embed = new EmbedBuilder()
    .setTitle("🎲 Fun: Dice Roll")
    .setDescription(
      [
        `**Roll:** \`${specText}\``,
        `**Result:** ${total}`,
        "",
        spec.modifier !== 0
          ? `**Dice sum:** ${sum} (modifier ${spec.modifier})`
          : `**Dice sum:** ${sum}`,
        `**Rolls:** ${rollsText}`,
      ].join("\n"),
    );

  await interaction.editReply({ embeds: [embed] });
}
