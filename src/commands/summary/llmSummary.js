import OpenAI from "openai";
import { env } from "@config/env.js";

let client = null;

// Initialize client only if API key exists
if (env.openAIKey) {
  client = new OpenAI({ apiKey: env.openAIKey });
}

export async function llmSummary(text) {
  if (!client) {
    return "LLM mode requested but no API key is configured.";
  }

  const prompt = `
You are a Discord channel summarizer.
Summarize the following messages into a short readable summary.
Do not include usernames or timestamps.
Text:
${text}
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content.trim();
}