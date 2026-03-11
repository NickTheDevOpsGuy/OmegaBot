// src/commands/games/fun/subcommands/utility/chat/chat.ts
// /fun chat – same conversational thread as DM / @mention (ChatGPT-style).

import type { ChatInputCommandInteraction } from "discord.js";
import {
  chatWithConversation,
  CHAT_SYSTEM_PROMPT_CONVERSATIONAL,
} from "../../../../../../services/integrations/ai/chatService.js";
import {
  conversationKey,
  getHistory,
  appendAndTrim,
  clear,
  wantsToClear,
} from "../../../../../../services/integrations/ai/conversationStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString("message", true).trim();
  const userId = interaction.user.id;
  const channelId = interaction.channelId ?? "";
  const isDM = interaction.channel?.isDMBased() ?? false;
  const key = isDM
    ? conversationKey("dm", userId)
    : conversationKey("channel", userId, channelId);

  if (wantsToClear(message)) {
    clear(key);
    await interaction.editReply({
      content: "Started a new conversation. What’s on your mind?",
    });
    return;
  }

  const history = getHistory(key);
  const messagesWithNew = [...history, { role: "user" as const, content: message }];
  const result = await chatWithConversation(
    CHAT_SYSTEM_PROMPT_CONVERSATIONAL,
    messagesWithNew,
  );

  if (!result.ok) {
    await interaction.editReply({ content: `❌ ${result.error}` });
    return;
  }

  appendAndTrim(key, message, result.text);
  const label = result.provider === "openai" ? "OpenAI" : "Claude";
  await interaction.editReply({ content: `${result.text}\n\n_— ${label}_` });
}
