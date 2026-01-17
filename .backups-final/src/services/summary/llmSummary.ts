// src/services/summary/llmSummary.ts
import OpenAI from "openai";
import { env, features } from "../../config/env.js";
import { getDb } from "../database/db.js";
import { logger } from "../../utils/logger.js";

/**
 * OpenAI pricing (approximate, per 1K tokens)
 * Update these based on current OpenAI pricing
 */
const PRICING = {
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
} as const;

/**
 * Rate limiting: max requests per user per hour.
 */
const MAX_REQUESTS_PER_HOUR = 10;

/**
 * OpenAI client (lazy-initialized).
 */
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!features.openai) {
      throw new Error("OpenAI is not configured");
    }
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

/**
 * Estimate cost for a request based on token usage.
 */
function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING["gpt-4o-mini"];
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  return promptCost + completionCost;
}

/**
 * Track OpenAI usage in database.
 */
function trackUsage(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): void {
  const cost = estimateCost(model, promptTokens, completionTokens);
  const stmt = getDb().prepare(`
    INSERT INTO openai_usage (user_id, model, prompt_tokens, completion_tokens, estimated_cost, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(userId, model, promptTokens, completionTokens, cost, Date.now());

  logger.debug(
    {
      userId,
      model,
      promptTokens,
      completionTokens,
      estimatedCost: cost.toFixed(4),
    },
    "OpenAI usage tracked",
  );
}

/**
 * Check rate limit for a user.
 */
function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count 
    FROM openai_usage 
    WHERE user_id = ? AND timestamp > ?
  `);

  const result = stmt.get(userId, oneHourAgo) as { count: number };

  if (result.count >= MAX_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      reason: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_HOUR} requests per hour.`,
    };
  }

  return { allowed: true };
}

/**
 * Get user's OpenAI usage statistics.
 */
export function getUserUsageStats(userId: string): {
  totalRequests: number;
  totalCost: number;
  requestsLastHour: number;
} {
  const db = getDb();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(estimated_cost) as cost
    FROM openai_usage
    WHERE user_id = ?
  `);

  const hourStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM openai_usage
    WHERE user_id = ? AND timestamp > ?
  `);

  const total = totalStmt.get(userId) as { count: number; cost: number };
  const hour = hourStmt.get(userId, oneHourAgo) as { count: number };

  return {
    totalRequests: total.count || 0,
    totalCost: total.cost || 0,
    requestsLastHour: hour.count || 0,
  };
}

/**
 * Generate a summary using OpenAI with proper error handling and cost controls.
 */
export async function generateLlmSummary(
  messages: string[],
  userId: string,
): Promise<{ success: true; summary: string } | { success: false; error: string }> {
  try {
    // Check if OpenAI is enabled
    if (!features.openai) {
      return {
        success: false,
        error: "OpenAI integration is not configured.",
      };
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      logger.warn({ userId }, "OpenAI rate limit exceeded");
      return {
        success: false,
        error: rateLimitCheck.reason || "Rate limit exceeded.",
      };
    }

    // Prepare the prompt
    const transcript = messages.join("\n");
    const prompt = `Summarize the following conversation concisely, highlighting key points and decisions:\n\n${transcript}`;

    // Check if prompt is too long (rough token estimate: 1 token ≈ 4 chars)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    if (estimatedTokens > env.openaiMaxTokens * 2) {
      return {
        success: false,
        error: "Conversation is too long to summarize. Try a shorter selection.",
      };
    }

    logger.info(
      {
        userId,
        model: env.openaiModel,
        messageCount: messages.length,
        estimatedPromptTokens: estimatedTokens,
      },
      "Generating LLM summary",
    );

    // Call OpenAI
    const response = await getClient().chat.completions.create({
      model: env.openaiModel,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, accurate summaries of conversations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: env.openaiMaxTokens,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content;

    if (!summary) {
      logger.error({ response }, "OpenAI returned empty response");
      return {
        success: false,
        error: "Failed to generate summary: empty response from OpenAI.",
      };
    }

    // Check cost
    const usage = response.usage;
    if (usage) {
      const estimatedCost = estimateCost(
        env.openaiModel,
        usage.prompt_tokens,
        usage.completion_tokens,
      );

      if (estimatedCost > env.openaiMaxCostPerRequest) {
        logger.warn(
          {
            userId,
            estimatedCost,
            maxCost: env.openaiMaxCostPerRequest,
          },
          "OpenAI request exceeded max cost",
        );
        return {
          success: false,
          error: `Request would exceed max cost limit ($${env.openaiMaxCostPerRequest.toFixed(2)}).`,
        };
      }

      // Track usage
      trackUsage(userId, env.openaiModel, usage.prompt_tokens, usage.completion_tokens);
    }

    logger.info({ userId, summaryLength: summary.length }, "LLM summary generated successfully");

    return {
      success: true,
      summary,
    };
  } catch (error) {
    logger.error({ error, userId }, "Failed to generate LLM summary");

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return {
          success: false,
          error: "OpenAI rate limit exceeded. Please try again later.",
        };
      }
      if (error.status === 401) {
        return {
          success: false,
          error: "OpenAI authentication failed. Please check API key configuration.",
        };
      }
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
      };
    }

    return {
      success: false,
      error: "Failed to generate summary. Please try again later.",
    };
  }
}
