// src/commands/fun/subcommands/choose.ts
// Pick one or more options at random from a list.

import type { ChatInputCommandInteraction } from "discord.js";

function parseItems(input: string): string[] {
  return input
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const itemsRaw = interaction.options.getString("items", true);
  const count = interaction.options.getInteger("count") ?? 1;

  const items = parseItems(itemsRaw);
  if (items.length === 0) {
    await interaction.editReply(
      "Provide at least one option. Separate multiple with commas or slashes (e.g. `pizza, pasta, salad`).",
    );
    return;
  }

  const pickCount = Math.min(count, items.length);
  const picked = shuffle(items).slice(0, pickCount);

  const result =
    pickCount === 1
      ? `**I choose:** ${picked[0]}`
      : `**I choose:** ${picked.map((s) => `**${s}**`).join(", ")}`;

  await interaction.editReply(result);
}
