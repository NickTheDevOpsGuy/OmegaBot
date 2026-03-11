// src/commands/games/fun/subcommands/utility/compliment/compliment.ts
// /fun compliment – nice AI compliment (uses OpenAI or Claude).

import type { ChatInputCommandInteraction } from "discord.js";
import { chatWithLLM } from "../../../../../../services/integrations/ai/chatService.js";

const COMPLIMENT_SYSTEM_PROMPT = `You are warm and encouraging. Reply with one or two short sentences complimenting the given person. Be genuine and specific (but keep it light). No over-the-top flattery. Under 200 characters.`;

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const displayName = target.globalName ?? target.username;

  const result = await chatWithLLM(
    `${displayName} (they're a Discord user, give them a nice compliment in 1-2 short sentences)`,
    { systemPrompt: COMPLIMENT_SYSTEM_PROMPT },
  );

  if (!result.ok) {
    await interaction.editReply({ content: `❌ ${result.error}` });
    return;
  }

  await interaction.editReply({
    content: `💜 **Compliment for ${displayName}:**\n\n${result.text}`,
  });
}
