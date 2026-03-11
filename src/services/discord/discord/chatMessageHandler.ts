// src/services/discord/discord/chatMessageHandler.ts
// Conversational chat when users DM the bot or @mention it (ChatGPT-style, with history).

import type { Client, Message } from "discord.js";
import {
  chatWithConversation,
  CHAT_SYSTEM_PROMPT_CONVERSATIONAL,
} from "../../integrations/ai/chatService.js";
import {
  conversationKey,
  getHistory,
  appendAndTrim,
  clear,
  wantsToClear,
} from "../../integrations/ai/conversationStore.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";
import {
  createRequestContext,
  runWithContextAsync,
  getContextLogger,
} from "../../../core/logging/requestContext.js";

function hasLLMConfigured(): boolean {
  return Boolean(env.openAIKey || process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Get the prompt from a message when the user is trying to chat with the bot.
 * - In DMs: the full message content.
 * - When @mentioned in a channel: the rest of the message after the mention.
 */
function getChatPrompt(message: Message, client: Client): string | null {
  const content = (message.content ?? "").trim();
  if (!content) return null;

  if (message.channel.isDMBased()) {
    return content;
  }

  const me = client.user;
  if (!me) return null;
  if (!message.mentions.has(me)) return null;

  const mentionPattern = new RegExp(`<@!?${me.id}>\\s*`, "g");
  const withoutMention = content.replace(mentionPattern, "").trim();
  return withoutMention || null;
}

function getConversationKey(message: Message, _client: Client): string | null {
  const userId = message.author.id;
  if (message.channel.isDMBased()) {
    return conversationKey("dm", userId);
  }
  return conversationKey("channel", userId, message.channel.id);
}

export function setupChatMessageHandler(client: Client): void {
  if (!hasLLMConfigured()) {
    logger.info(
      "[chat] Message-based chat disabled: no OPENAI_API_KEY or ANTHROPIC_API_KEY",
    );
    return;
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prompt = getChatPrompt(message, client);
    if (prompt === null) return;

    const key = getConversationKey(message, client);
    if (!key) return;

    const ctx = createRequestContext({
      userId: message.author.id,
      guildId: message.guildId ?? undefined,
      channelId: message.channel.id,
      command: "chat",
      meta: { conversationKey: key, isDM: message.channel.isDMBased() },
    });

    await runWithContextAsync(ctx, async () => {
      const log = getContextLogger();
      try {
        if (wantsToClear(prompt)) {
          clear(key);
          await message
            .reply({ content: "Started a new conversation. What’s on your mind?" })
            .catch(() => {});
          return;
        }

        await message.channel.sendTyping();

        const history = getHistory(key);
        const messagesWithNew = [...history, { role: "user" as const, content: prompt }];

        const result = await chatWithConversation(
          CHAT_SYSTEM_PROMPT_CONVERSATIONAL,
          messagesWithNew,
        );

        if (!result.ok) {
          await message.reply({ content: `❌ ${result.error}` }).catch(() => {});
          return;
        }

        appendAndTrim(key, prompt, result.text);

        const label = result.provider === "openai" ? "OpenAI" : "Claude";
        const reply = `${result.text}\n\n_— ${label}_`;
        await message.reply({ content: reply }).catch(() => {});
      } catch (err) {
        log.warn({ err, userId: message.author.id }, "[chat] message handler failed");
        await message
          .reply({ content: "Something went wrong with the chat. Please try again in a moment." })
          .catch(() => {});
      }
    });
  });

  logger.info(
    "[chat] Conversational chat enabled (DM or @mention the bot; say “new chat” to reset)",
  );
}
