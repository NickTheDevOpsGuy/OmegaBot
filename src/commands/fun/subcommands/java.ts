// src/commands/fun/subcommands/java.ts

import type { ChatInputCommandInteraction } from "discord.js";

const JOKES: string[] = [
  "Why do Java developers wear glasses? Because they don’t C#.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
  "I told my Java program a joke… it didn’t laugh. It just threw an exception.",
  "Java: Write once, debug everywhere.",
  "Why was the Java developer broke? Because they used up all their cache.",
  "My Java app is really secure. It has *private* everything.",
  "How many Java devs does it take to change a light bulb? None, it’s a hardware problem.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.editReply(`☕ ${pick(JOKES)}`);
}
