// src/services/summary/llmSummary.ts

import OpenAI from "openai";
import { env } from "../../config/env.js";

let client: OpenAI | null = null;

if (env.openAIKey) {
  client = new OpenAI({ apiKey: env.openAIKey });
}

/**
 * Generate a structured summary (Markdown) from the transcript.
 * Safe fallback if LLM mode is requested without a key.
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

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  /**
   * Extract the model output, defaulting to a fallback message if no content is returned.
   */
  const content = response.choices?.[0]?.message?.content ?? "LLM returned no content.";

  return content.trim();
}
