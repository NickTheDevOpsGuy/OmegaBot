// src/services/ai/claudeService.ts
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../../utils/logger.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Claude API for text generation
 */
export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    systemPrompt = "You are a helpful assistant.",
    maxTokens = 4096,
    temperature = 1.0,
  } = options;

  try {
    logger.info({ promptLength: prompt.length }, "Calling Claude API");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    logger.info(
      {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      "Claude API call successful"
    );

    return textContent.text;
  } catch (error) {
    logger.error({ error }, "Claude API call failed");
    throw new Error("Failed to get response from Claude");
  }
}

/**
 * Summarize GitHub commit history
 */
export async function summarizeCommitHistory(commits: string): Promise<string> {
  const systemPrompt = `You are a helpful assistant that summarizes git commit history. 
Be concise and focus on the most important changes. 
Group related commits together and highlight breaking changes or major features.`;

  const prompt = `Summarize the following commit history. Focus on major changes, features, and fixes:

\${commits}

Provide a clear, organized summary in bullet points.`;

  return callClaude(prompt, {
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });
}

/**
 * Summarize GitHub PR/issue discussion
 */
export async function summarizeDiscussion(
  title: string,
  body: string,
  comments: string
): Promise<string> {
  const systemPrompt = `You are a helpful assistant that summarizes GitHub discussions. 
Be objective and highlight key decisions, concerns, and action items.`;

  const prompt = `Summarize this GitHub discussion:

**Title:** \${title}

**Description:**
\${body}

**Comments:**
\${comments}

Provide a concise summary covering:
1. Main topic/purpose
2. Key points discussed
3. Decisions made (if any)
4. Action items or next steps`;

  return callClaude(prompt, {
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });
}
