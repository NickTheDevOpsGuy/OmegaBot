// src/commands/fun/subcommands/fact.ts
import type { ChatInputCommandInteraction } from "discord.js";

const FACTS: string[] = [
  "Honey never spoils. Sealed honey has been found edible thousands of years later.",
  "Octopuses have three hearts and blue blood.",
  "Bananas are berries, but strawberries are not.",
  "A day on Venus is longer than a year on Venus.",
  "Wombat poop is cube-shaped.",
  "Some sharks can glow in the dark (bioluminescence).",
  "There are more trees on Earth than stars in the Milky Way (best estimates).",
  "Scotland’s national animal is the unicorn.",
  "The Eiffel Tower can be about 15 cm taller in summer due to thermal expansion.",
  "You can hear a blue whale’s calls hundreds of miles away in the right conditions.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const fact = pick(FACTS);
  await interaction.editReply(`🧠 **Random Fact**\n${fact}`);
}
