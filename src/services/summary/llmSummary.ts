import OpenAI from "openai";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

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
  const delays = [250, 700, 1400]; // quick backoff
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
 */
export async function llmSummary(text: string): Promise<string> {
  if (!client) {
    return "LLM mode requested but no API key is configured.";
  }

  // Guard: do not send absurd payloads
  const trimmed = text.trim();
  if (!trimmed) return "No transcript content provided.";

  const system = [
    "You are a Discord channel summarizer.",
    "You produce crisp, actionable, structured Markdown.",
    "You do not invent facts that are not in the transcript.",
  ].join("\n");

  const user = [
    "Summarize the transcript below.",
    "",
    "Return exactly these sections in Markdown:",
    "## Summary",
    "- 3 to 6 bullets capturing the most important outcomes",
    "",
    "## Key points",
    "- 5 to 10 bullets, concrete and specific",
    "",
    "## Decisions",
    "- If none, write: None",
    "",
    "## Action items",
    "- If none, write: None",
    "",
    "## Open questions",
    "- If none, write: None",
    "",
    "Rules:",
    "- No timestamps.",
    "- Avoid quoting usernames; paraphrase as 'someone'/'a teammate' when possible.",
    "- Prefer concrete details (commands, files, errors, numbers) over vague statements.",
    "- If the transcript is mostly chatter, say that clearly.",
    "",
    "Transcript:",
    trimmed,
  ].join("\n");

  try {
    const response = await withRetries(
      async () =>
        client!.chat.completions.create({
          // Pick your model. If you want a stronger summary, bump to gpt-4o.
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
        }),
      "openai.chat.completions.create",
    );

    const content = response.choices?.[0]?.message?.content ?? "";
    const out = content.trim();

    return out || "LLM returned no content.";
  } catch (err) {
    logger.error({ err }, "[summary/llm] summary generation failed");
    return "Failed to generate summary via LLM.";
  }
}
