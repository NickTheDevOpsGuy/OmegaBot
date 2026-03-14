// src/services/integrations/ai/chatService.ts
// Single-turn LLM chat for /fun chat and message-based chat (DM or @mention).
// Uses the same OpenAI token as ChatGPT (OPENAI_API_KEY in .env) when set, else Claude (ANTHROPIC_API_KEY).

import OpenAI from "openai";
import { env } from "../../../config/env.js";
import { errMessage } from "../../../utils/errors.js";
import { logger } from "../../../utils/logger.js";
import {
  callClaude,
  callClaudeWithMessages,
  type ClaudeMessage,
} from "./claudeService.js";
import type { ChatMode } from "./conversationStore.js";

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
Avoid huge blocks of text; use short paragraphs or bullets when helpful.
Be especially good at supportive "catch-up" conversations: ask gentle follow-up questions, reflect what the user shared, and help them feel heard.
Do not claim to be a therapist, counselor, or mental health professional, and do not present your support as therapy.
If a user sounds distressed, respond with empathy, encourage reaching out to trusted people or local professional/crisis support, and avoid shaming or alarmist language.`;

const CHAT_MODE_PROMPTS: Record<ChatMode, string> = {
  supportive:
    "Default to a warm, supportive tone. Reflect what the user said, validate gently, and ask one thoughtful follow-up question when helpful.",
  casual:
    "Keep the tone relaxed and conversational. Be friendly and light, but still attentive and respectful.",
  practical:
    "Focus on concrete next steps, problem-solving, and clarity. Keep emotional reflection brief but kind.",
  grounding:
    "Respond calmly and steadily. Prioritize reassurance, breathing/grounding suggestions, and one simple next step at a time.",
};

export type DistressLevel = "none" | "support" | "crisis";

export function detectDistressLevel(text: string): DistressLevel {
  const t = text.toLowerCase();
  const crisisPatterns = [
    /kill myself/,
    /want to die/,
    /end my life/,
    /suicid/,
    /self[- ]harm/,
    /hurt myself/,
    /can't go on/,
  ];
  if (crisisPatterns.some((pattern) => pattern.test(t))) return "crisis";

  const supportPatterns = [
    /panic/,
    /anxious/,
    /depress/,
    /overwhelm/,
    /hopeless/,
    /lonely/,
    /burnt? out/,
    /burned out/,
    /stressed/,
    /can't cope/,
  ];
  if (supportPatterns.some((pattern) => pattern.test(t))) return "support";
  return "none";
}

export function buildConversationSystemPrompt(args: {
  mode: ChatMode;
  memorySummary?: string;
  distressLevel?: DistressLevel;
}): string {
  const parts = [CHAT_SYSTEM_PROMPT_CONVERSATIONAL, CHAT_MODE_PROMPTS[args.mode]];
  if (args.memorySummary?.trim()) {
    parts.push(
      "Use this saved conversation context only as helpful background, and do not overstate certainty:",
      args.memorySummary.trim(),
    );
  }
  if (args.distressLevel === "support") {
    parts.push(
      "The user may be emotionally distressed. Prioritize empathy, gentle reflection, and one calming next step.",
    );
  }
  if (args.distressLevel === "crisis") {
    parts.push(
      "The user may be in crisis or at risk of self-harm. Respond with empathy, encourage immediate support from a trusted person and local crisis/emergency services, avoid any harmful detail, and keep the response direct and caring.",
    );
  }
  return parts.join("\n\n");
}

export function appendSafetyFollowup(text: string, distressLevel: DistressLevel): string {
  if (distressLevel !== "crisis") return text;
  if (/988|crisis|emergency/i.test(text)) return truncateForDiscord(text);
  return truncateForDiscord(
    `${text}\n\nIf you're in the U.S. or Canada, call or text 988 now. If you're elsewhere, contact local emergency or crisis services, or get someone with you right away.`,
  );
}

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
        return {
          ok: false,
          error: "The AI didn't return a response. Send your message again.",
        };
      }
      logger.debug({ model: env.openAIModel }, "[chat] OpenAI reply");
      return { ok: true, text: truncateForDiscord(content), provider: "openai" };
    } catch (err) {
      logger.warn({ err }, `[chat] OpenAI single-message call threw: ${errMessage(err)}`);
      return {
        ok: false,
        error: "The AI service didn't respond. Try again in a moment.",
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
      logger.warn({ err }, `[chat] Claude single-message call threw: ${errMessage(err)}`);
      return {
        ok: false,
        error: "The AI service didn't respond. Try again in a moment.",
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
    return { ok: false, error: "Your message couldn't be processed. Send it again." };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return { ok: false, error: "Your message couldn't be processed. Send it again." };
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
        return {
          ok: false,
          error: "The AI didn't return a response. Send your message again.",
        };
      return { ok: true, text: truncateForDiscord(content), provider: "openai" };
    } catch (err) {
      logger.warn({ err }, `[chat] OpenAI conversation call threw: ${errMessage(err)}`);
      return {
        ok: false,
        error: "The AI service didn't respond. Try again in a moment.",
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
      logger.warn({ err }, `[chat] Claude conversation call threw: ${errMessage(err)}`);
      return {
        ok: false,
        error: "The AI service didn't respond. Try again in a moment.",
      };
    }
  }

  return {
    ok: false,
    error:
      "Chat isn't available right now. The server admin needs to set up an API key (OpenAI or Claude).",
  };
}
