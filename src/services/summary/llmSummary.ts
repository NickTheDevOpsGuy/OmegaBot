import OpenAI from "openai";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { openaiCircuit } from "../circuitBreaker/breakers.js";

let client: OpenAI | null = null;

if (env.openAIKey) {
  client = new OpenAI({ apiKey: env.openAIKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("temporarily") ||
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("network") ||
    msg.includes("fetch")
  );
}

async function withRetries<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [250, 700, 1400];
  let lastErr: unknown = null;

  for (let i = 0; i < delays.length + 1; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retry = isRetryable(err) && i < delays.length;
      logger.warn({ err, attempt: i + 1, label, retry }, "[summary/llm] call failed");

      if (!retry) break;
      await sleep(delays[i]!);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("LLM request failed");
}

/**
 * Generate a structured summary (Markdown) from a transcript using OpenAI.
 *
 * Key improvement:
 * - Forces *salience ranking* (primary issue vs secondary topics)
 * - Reduces repeated bullets across sections
 * - Produces a more readable "so what / now what" shape
 */
export async function llmSummary(text: string): Promise<string> {
  if (!client) {
    return "LLM mode requested but no API key is configured.";
  }

  const trimmed = text.trim();
  if (!trimmed) return "No transcript content provided.";

  const system = [
    "You are a Discord channel summarizer.",
    "You produce concise, high-signal Markdown.",
    "You do not invent facts that are not in the transcript.",
    "You rank importance: one primary issue, then secondary topics.",
  ].join("\n");

  const user = [
    "Summarize the transcript below for someone who missed the discussion.",
    "",
    "Return EXACTLY these sections, in this order, using Markdown headings:",
    "",
    "## Primary issue",
    "- 1 to 2 bullets: the single most important problem/outcome discussed.",
    "- If there is no single issue, write: None",
    "",
    "## Secondary topics",
    "- 2 to 6 bullets: related discussion points that are not the main issue.",
    "- If none, write: None",
    "",
    "## Summary",
    "- 3 to 6 bullets: what happened, in logical order (cause -> effect).",
    "- Avoid repeating the same bullet ideas from above verbatim.",
    "",
    "## Decisions",
    "- If none, write: None",
    "",
    "## Action items",
    '- 1 to 8 bullets with an owner if possible ("Someone will...").',
    "- If none, write: None",
    "",
    "## Open questions",
    "- If none, write: None",
    "",
    "Rules:",
    "- No timestamps.",
    "- Do not quote usernames; use generic roles like 'someone', 'a teammate', 'an admin'.",
    "- Prefer concrete details (links, settings, errors, config names) when present.",
    "- Do not include filler. If content is mostly chatter, say so in Summary.",
    "",
    "Transcript:",
    trimmed,
  ].join("\n");

  try {
    const response = await openaiCircuit.execute(async () =>
      withRetries(
        async () =>
          client!.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
        }),
      "openai.chat.completions.create",
    ),
    );

    const content = response.choices?.[0]?.message?.content ?? "";
    const out = content.trim();

    return out || "LLM returned no content.";
  } catch (err) {
    logger.error({ err }, "[summary/llm] summary generation failed");
    return "Failed to generate summary via LLM.";
  }
}
