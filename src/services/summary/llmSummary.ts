import OpenAI from "openai";
import { env } from "../../config/env.js";

/**
 * Set client
 */
let client: OpenAI | null = null;

/**
 * if OpenAPIKey is set use it for client
 */
if (env.openAIKey) {
  client = new OpenAI({ apiKey: env.openAIKey });
}

/**
 * Generates an LLM summary of the provided text.
 * Falls back to a safe message if no API key is configured.
 */
export async function llmSummary(text: string): Promise<string> {
  if (!client) {
    return "LLM mode requested but no API key is configured.";
  }

  /**
   * Build a prompt instructing the LLM to summarize messages in a clean, neutral format.
   */
  const prompt = `
You are a Discord channel summarizer.
Summarize the following messages into a short readable summary.
Do not include usernames or timestamps.
Text:
${text}
  `;

  /**
   * Send the summary prompt to the gpt-4o-mini model.
   */
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  /**
   * Extract the model output, defaulting to a fallback message if no content is returned.
   */
  const content =
    response.choices?.[0]?.message?.content ?? "LLM returned no content.";

  /**
   * Return the cleaned summary text.
   */
  return content.trim();
}
