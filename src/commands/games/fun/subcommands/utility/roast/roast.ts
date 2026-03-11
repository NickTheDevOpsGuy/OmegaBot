// src/commands/games/fun/subcommands/utility/roast/roast.ts
// /fun roast – playful AI roast (uses OpenAI or Claude).

import type { ChatInputCommandInteraction } from "discord.js";
import { chatWithLLM } from "../../../../../../services/integrations/ai/chatService.js";

const ROAST_SYSTEM_PROMPT = `You are a witty, playful roaster. Reply with one or two short sentences roasting the given person. Be funny and light-hearted. No slurs, no real cruelty, no sensitive topics. Keep it under 200 characters.`;

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const displayName = target.globalName ?? target.username;

  const result = await chatWithLLM(
    `${displayName} (they're a Discord user, roast them playfully in 1-2 short sentences)`,
    { systemPrompt: ROAST_SYSTEM_PROMPT },
  );

  if (!result.ok) {
    await interaction.editReply({ content: `❌ ${result.error}` });
    return;
  }

  await interaction.editReply({
    content: `🔥 **Roast for ${displayName}:**\n\n${result.text}`,
  });
}
