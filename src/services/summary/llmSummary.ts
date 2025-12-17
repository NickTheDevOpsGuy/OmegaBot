import OpenAI from "openai";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

let client: OpenAI | null = null;

/**
 * Initialize OpenAI client only if an API key is present.
 * This allows the bot to run in "local" summary mode without crashing.
 */
if (env.openAIKey) {
  client = new OpenAI({ apiKey: env.openAIKey });
}

/**
 * Generate a structured summary (Markdown) from a transcript using an LLM.
 *
 * Behavior:
 * - If LLM mode is requested but no API key is configured, return a safe message
 * - If the OpenAI request fails, log the error and return a user-friendly fallback
 *
 * We intentionally:
 * - Do NOT log the transcript or prompt (privacy + noise)
 * - Log only the failure signal for observability
 */
export async function llmSummary(text: string): Promise<string> {
  if (!client) {
    return "LLM mode requested but no API key is configured.";
  }

  const prompt = [
    "You are a Discord channel summarizer.",
    "Given the transcript below, produce a structured Markdown output with these sections:",
    "## Summary (2 to 5 bullets)",
    "## Key points (3 to 8 bullets)",
    "## Action items (if any, otherwise say 'None')",
    "## Open questions (if any, otherwise say 'None')",
    "",
    "Rules:",
    "- Do not include timestamps.",
    "- Avoid quoting usernames; paraphrase instead unless absolutely necessary.",
    "- Keep it concise and readable.",
    "",
    "Transcript:",
    text,
  ].join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    /**
     * Extract model output, falling back safely if no content is returned.
     */
    const content = response.choices?.[0]?.message?.content ?? "LLM returned no content.";

    return content.trim();
  } catch (err) {
    logger.error({ err }, "LLM summary generation failed");
    return "Failed to generate summary via LLM.";
  }
}
