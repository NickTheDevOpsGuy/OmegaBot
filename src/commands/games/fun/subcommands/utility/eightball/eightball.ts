// src/commands/fun/subcommands/eightball.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../../../../utils/logger.js";

const RESPONSES = [
  // Positive
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  // Neutral
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  // Negative
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

function getRandomResponse(): string {
  return RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const question = interaction.options.getString("question", true);

  try {
    const response = getRandomResponse();

    const lines: string[] = [];
    lines.push(`🎱 **Question:** ${question}`);
    lines.push("");
    lines.push(`**Answer:** ${response}`);

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[fun/8ball] 8-ball handler threw");
    await interaction.editReply("The magic 8-ball is cloudy. Ask again in a moment.");
  }
}
