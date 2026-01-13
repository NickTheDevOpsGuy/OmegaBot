// src/commands/fun/subcommands/poll.ts

import type { ChatInputCommandInteraction, Message } from "discord.js";

const REACTIONS: string[] = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

type PollArgs = {
  question: string;
  options: string[];
};

function buildPollText(args: PollArgs): string {
  const { question, options } = args;

  const lines: string[] = [];
  lines.push(`📊 **${question}**`);
  lines.push("");

  for (let i = 0; i < options.length; i += 1) {
    const emoji = REACTIONS[i] ?? "•";
    lines.push(`${emoji} ${options[i]}`);
  }

  lines.push("");
  lines.push("_React below to vote._");

  return lines.join("\n");
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const question = interaction.options.getString("question", true).trim();

  // options are option1..option4
  const opt1 = interaction.options.getString("option1", true).trim();
  const opt2 = interaction.options.getString("option2", true).trim();
  const opt3 = interaction.options.getString("option3")?.trim() ?? "";
  const opt4 = interaction.options.getString("option4")?.trim() ?? "";

  const options = [opt1, opt2, opt3, opt4].filter((s: string) => s.length > 0);

  if (options.length < 2 || options.length > 4) {
    await interaction.editReply("Poll requires 2–4 options.");
    return;
  }

  await interaction.editReply(buildPollText({ question, options }));

  // Add reactions to the sent message
  const reply = (await interaction.fetchReply()) as Message;

  for (let i = 0; i < options.length; i += 1) {
    const emoji = REACTIONS[i];
    if (!emoji) continue;

    try {
      await reply.react(emoji);
    } catch {
      // If bot can't add reactions, don't fail the command.
      // The poll message is still usable.
    }
  }
}