// src/services/integrations/ai/chatService.ts
// Single-turn LLM chat for /fun chat and message-based chat (DM or @mention).
// Uses the same OpenAI token as ChatGPT (OPENAI_API_KEY in .env) when set, else Claude (ANTHROPIC_API_KEY).

import OpenAI from "openai";
import { env } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";
import {
  callClaude,
  callClaudeWithMessages,
  type ClaudeMessage,
} from "./claudeService.js";

const REPLY_MAX_LENGTH = 1950;

function truncateForDiscord(text: string): string {
  const t = text.trim();
  if (t.length <= REPLY_MAX_LENGTH) return t;
  return t.slice(0, REPLY_MAX_LENGTH - 1) + "…";
}

export type ChatResult =
  | { ok: true; text: string; provider: "openai" | "claude" }
  | { ok: false; error: string };

const CHAT_SYSTEM_PROMPT = `You are a friendly, helpful assistant in a Discord server. 
Keep replies concise and readable in chat. Use clear, casual language. 
Avoid huge blocks of text; use short paragraphs or bullets when helpful.`;

/** Used for multi-turn conversational chat (DM / @mention). */
export const CHAT_SYSTEM_PROMPT_CONVERSATIONAL = `You are a friendly, helpful assistant in a Discord server. 
You have an ongoing conversation with the user—remember what they said and reply in context.
Keep replies concise and readable in chat. Use clear, casual language. 
Avoid huge blocks of text; use short paragraphs or bullets when helpful.`;

export type ChatOptions = {
  systemPrompt?: string;
};

/**
 * Send a single user message to an LLM and return the reply.
 * Prefers OpenAI if OPENAI_API_KEY is set, otherwise uses Claude if ANTHROPIC_API_KEY is set.
 * Pass options.systemPrompt to override the default (e.g. for roast/compliment).
 */
export async function chatWithLLM(
  userMessage: string,
  options: ChatOptions = {},
): Promise<ChatResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { ok: false, error: "Please type a message to chat." };
  }

  const systemPrompt = options.systemPrompt ?? CHAT_SYSTEM_PROMPT;

  if (env.openAIKey) {
    try {
      const client = new OpenAI({ apiKey: env.openAIKey });
      const response = await client.chat.completions.create({
        model: env.openAIModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmed },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });
      const content = response.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return { ok: false, error: "The AI didn't return a response. Please try again." };
      }
      logger.debug({ model: env.openAIModel }, "[chat] OpenAI reply");
      return { ok: true, text: truncateForDiscord(content), provider: "openai" };
    } catch (err) {
      logger.warn({ err }, "[chat] OpenAI failed");
      return {
        ok: false,
        error: "The AI service didn't respond. Please try again in a moment.",
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const text = await callClaude(trimmed, {
        systemPrompt,
        maxTokens: 1024,
        temperature: 0.7,
      });
      logger.debug({}, "[chat] Claude reply");
      return { ok: true, text: truncateForDiscord(text), provider: "claude" };
    } catch (err) {
      logger.warn({ err }, "[chat] Claude failed");
      return {
        ok: false,
        error: "The AI service didn't respond. Please try again in a moment.",
      };
    }
  }

  return {
    ok: false,
    error:
      "Chat isn't available right now. The server admin needs to set up an API key (OpenAI or Claude).",
  };
}

export type ConversationMessage = { role: "user" | "assistant"; content: string };

/**
 * Multi-turn conversation: pass system prompt + full history (must end with user message).
 * Returns the new assistant reply. Use this for ChatGPT-style back-and-forth.
 */
export async function chatWithConversation(
  systemPrompt: string,
  messages: ConversationMessage[],
  options: { maxTokens?: number } = {},
): Promise<ChatResult> {
  if (messages.length === 0) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const { maxTokens = 1024 } = options;

  const openAiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  if (env.openAIKey) {
    try {
      const client = new OpenAI({ apiKey: env.openAIKey });
      const response = await client.chat.completions.create({
        model: env.openAIModel,
        messages: openAiMessages,
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      const content = response.choices?.[0]?.message?.content?.trim();
      if (!content)
        return { ok: false, error: "The AI didn't return a response. Please try again." };
      return { ok: true, text: truncateForDiscord(content), provider: "openai" };
    } catch (err) {
      logger.warn({ err }, "[chat] OpenAI conversation failed");
      return {
        ok: false,
        error: "The AI service didn't respond. Please try again in a moment.",
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const claudeMessages: ClaudeMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const text = await callClaudeWithMessages(systemPrompt, claudeMessages, {
        maxTokens,
        temperature: 0.7,
      });
      return { ok: true, text: truncateForDiscord(text), provider: "claude" };
    } catch (err) {
      logger.warn({ err }, "[chat] Claude conversation failed");
      return {
        ok: false,
        error: "The AI service didn't respond. Please try again in a moment.",
      };
    }
  }

  return {
    ok: false,
    error:
      "Chat isn't available right now. The server admin needs to set up an API key (OpenAI or Claude).",
  };
}
