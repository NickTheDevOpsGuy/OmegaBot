// src/commands/games/fun/subcommands/utility/chat/chat.ts
// /fun chat – same conversational thread as DM / @mention (ChatGPT-style).

import type { ChatInputCommandInteraction } from "discord.js";
import {
  appendSafetyFollowup,
  buildConversationSystemPrompt,
  chatWithConversation,
  detectDistressLevel,
} from "../../../../../../services/integrations/ai/chatService.js";
import {
  addConversationMemoryNote,
  buildConversationRecap,
  clearConversationMemory,
  conversationKey,
  appendAndTrim,
  clear,
  getConversationProfile,
  getHistory,
  setConversationMemoryEnabled,
  setConversationMode,
  type ChatMode,
  updateConversationMemoryFromTurn,
  wantsToClear,
} from "../../../../../../services/integrations/ai/conversationStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const action = interaction.options.getString("action") ?? "send";
  const message = interaction.options.getString("message")?.trim() ?? "";
  const modeInput = interaction.options.getString("mode") as ChatMode | null;
  const userId = interaction.user.id;
  const channelId = interaction.channelId ?? "";
  const isDM = interaction.channel?.isDMBased() ?? false;
  const key = isDM
    ? conversationKey("dm", userId)
    : conversationKey("channel", userId, channelId);
  const currentProfile = getConversationProfile(key);
  const mode = modeInput ?? currentProfile.preferredMode;

  if (modeInput) {
    setConversationMode(key, modeInput);
  }

  if (action === "recap") {
    await interaction.editReply({ content: buildConversationRecap(key) });
    return;
  }

  if (action === "forget") {
    clearConversationMemory(key);
    setConversationMemoryEnabled(key, false);
    await interaction.editReply({
      content:
        "Cleared saved conversation context for this thread. Ongoing message history still works unless you also start a new chat.",
    });
    return;
  }

  if (action === "remember") {
    if (!message) {
      setConversationMemoryEnabled(key, true);
      await interaction.editReply({
        content:
          "Memory is enabled for this conversation. Send another `remember` message to save a specific note.",
      });
      return;
    }
    addConversationMemoryNote(key, message);
    setConversationMemoryEnabled(key, true);
    await interaction.editReply({
      content: "Saved that context for future catch-ups in this conversation.",
    });
    return;
  }

  const effectiveMessage =
    action === "checkin"
      ? message ||
        "Can you help me do a gentle emotional check-in and ask a few supportive questions?"
      : message;

  if (!effectiveMessage) {
    await interaction.editReply({
      content:
        "Please add a message, or use `action:recap`, `action:checkin`, `action:remember`, or `action:forget`.",
    });
    return;
  }

  if (wantsToClear(effectiveMessage)) {
    clear(key);
    await interaction.editReply({
      content: "Started a new conversation. What’s on your mind?",
    });
    return;
  }

  const history = getHistory(key);
  const distressLevel = detectDistressLevel(effectiveMessage);
  const systemPrompt = buildConversationSystemPrompt({
    mode,
    memorySummary: getConversationProfile(key).memoryEnabled
      ? getConversationProfile(key).memorySummary
      : "",
    distressLevel,
  });
  const messagesWithNew = [
    ...history,
    { role: "user" as const, content: effectiveMessage },
  ];
  const result = await chatWithConversation(systemPrompt, messagesWithNew);

  if (!result.ok) {
    await interaction.editReply({ content: `❌ ${result.error}` });
    return;
  }

  updateConversationMemoryFromTurn(key, effectiveMessage);
  const safeText = appendSafetyFollowup(result.text, distressLevel);
  appendAndTrim(key, effectiveMessage, safeText);
  await interaction.editReply({ content: safeText });
}
