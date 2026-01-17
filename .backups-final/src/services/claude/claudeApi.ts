// src/services/claude/claudeApi.ts
import Anthropic from "@anthropic-ai/sdk";
import { env, features } from "../../config/env.js";
import { getDb } from "../database/db.js";
import { logger } from "../../utils/logger.js";

/**
 * Claude API pricing (approximate, per million tokens)
 * Update these based on current Anthropic pricing
 */
const PRICING = {
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-sonnet-3-5-20241022": { input: 3.0, output: 15.0 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4.0 },
} as const;

/**
 * Rate limiting: max requests per user per hour.
 */
const MAX_REQUESTS_PER_HOUR = 20;

/**
 * Claude API client (lazy-initialized).
 */
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!features.claude) {
      throw new Error("Claude API is not configured");
    }
    client = new Anthropic({ apiKey: env.claudeApiKey });
  }
  return client;
}

/**
 * Estimate cost for a request based on token usage.
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing =
    PRICING[model as keyof typeof PRICING] || PRICING["claude-sonnet-4-20250514"];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Track Claude API usage in database.
 */
function trackUsage(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): void {
  const cost = estimateCost(model, inputTokens, outputTokens);
  const stmt = getDb().prepare(`
    INSERT INTO claude_usage (user_id, model, input_tokens, output_tokens, estimated_cost, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(userId, model, inputTokens, outputTokens, cost, Date.now());

  logger.debug(
    {
      userId,
      model,
      inputTokens,
      outputTokens,
      estimatedCost: cost.toFixed(4),
    },
    "Claude API usage tracked",
  );
}

/**
 * Check rate limit for a user.
 */
function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const stmt = getDb().prepare(`
    SELECT COUNT(*) as count 
    FROM claude_usage 
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
 * Get user's Claude API usage statistics.
 */
export function getUserClaudeUsageStats(userId: string): {
  totalRequests: number;
  totalCost: number;
  requestsLastHour: number;
} {
  const db = getDb();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(estimated_cost) as cost
    FROM claude_usage
    WHERE user_id = ?
  `);

  const hourStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM claude_usage
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
 * Generate a summary using Claude API with proper error handling and cost controls.
 */
export async function generateClaudeSummary(
  messages: string[],
  userId: string,
): Promise<{ success: true; summary: string } | { success: false; error: string }> {
  try {
    // Check if Claude API is enabled
    if (!features.claude) {
      return {
        success: false,
        error: "Claude API integration is not configured.",
      };
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      logger.warn({ userId }, "Claude API rate limit exceeded");
      return {
        success: false,
        error: rateLimitCheck.reason || "Rate limit exceeded.",
      };
    }

    // Prepare the conversation transcript
    const transcript = messages.join("\n");

    logger.info(
      {
        userId,
        model: env.claudeModel,
        messageCount: messages.length,
        transcriptLength: transcript.length,
      },
      "Generating Claude summary",
    );

    // Call Claude API
    const response = await getClient().messages.create({
      model: env.claudeModel,
      max_tokens: env.claudeMaxTokens,
      messages: [
        {
          role: "user",
          content: `Please provide a concise summary of this conversation, highlighting the key points, decisions, and action items:\n\n${transcript}`,
        },
      ],
    });

    const summary =
      response.content[0]?.type === "text" ? response.content[0].text : null;

    if (!summary) {
      logger.error({ response }, "Claude API returned empty response");
      return {
        success: false,
        error: "Failed to generate summary: empty response from Claude API.",
      };
    }

    // Track usage
    if (response.usage) {
      trackUsage(
        userId,
        env.claudeModel,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );

      const estimatedCost = estimateCost(
        env.claudeModel,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );

      // Check if cost exceeded limit (warning only, we already made the request)
      if (estimatedCost > env.claudeMaxCostPerRequest) {
        logger.warn(
          {
            userId,
            estimatedCost,
            maxCost: env.claudeMaxCostPerRequest,
          },
          "Claude API request exceeded max cost (post-request warning)",
        );
      }
    }

    logger.info({ userId, summaryLength: summary.length }, "Claude summary generated successfully");

    return {
      success: true,
      summary,
    };
  } catch (error) {
    logger.error({ error, userId }, "Failed to generate Claude summary");

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return {
          success: false,
          error: "Claude API rate limit exceeded. Please try again later.",
        };
      }
      if (error.status === 401) {
        return {
          success: false,
          error: "Claude API authentication failed. Please check API key configuration.",
        };
      }
      return {
        success: false,
        error: `Claude API error: ${error.message}`,
      };
    }

    return {
      success: false,
      error: "Failed to generate summary. Please try again later.",
    };
  }
}

/**
 * Analyze conversation history using Claude API.
 */
export async function analyzeConversationHistory(
  messages: string[],
  userId: string,
  analysisType: "summary" | "insights" | "timeline" = "summary",
): Promise<{ success: true; analysis: string } | { success: false; error: string }> {
  try {
    if (!features.claude) {
      return {
        success: false,
        error: "Claude API integration is not configured.",
      };
    }

    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      logger.warn({ userId }, "Claude API rate limit exceeded");
      return {
        success: false,
        error: rateLimitCheck.reason || "Rate limit exceeded.",
      };
    }

    const transcript = messages.join("\n");

    const prompts = {
      summary:
        "Provide a detailed summary of this conversation, organized by topics discussed.",
      insights:
        "Analyze this conversation and provide key insights, patterns, and notable moments.",
      timeline:
        "Create a chronological timeline of the key events and topics in this conversation.",
    };

    const prompt = prompts[analysisType];

    logger.info(
      {
        userId,
        model: env.claudeModel,
        messageCount: messages.length,
        analysisType,
      },
      "Analyzing conversation with Claude",
    );

    const response = await getClient().messages.create({
      model: env.claudeModel,
      max_tokens: env.claudeMaxTokens,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nConversation:\n${transcript}`,
        },
      ],
    });

    const analysis =
      response.content[0]?.type === "text" ? response.content[0].text : null;

    if (!analysis) {
      return {
        success: false,
        error: "Failed to analyze conversation: empty response from Claude API.",
      };
    }

    if (response.usage) {
      trackUsage(
        userId,
        env.claudeModel,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );
    }

    logger.info({ userId, analysisLength: analysis.length }, "Conversation analysis complete");

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    logger.error({ error, userId, analysisType }, "Failed to analyze conversation");

    if (error instanceof Anthropic.APIError) {
      return {
        success: false,
        error: `Claude API error: ${error.message}`,
      };
    }

    return {
      success: false,
      error: "Failed to analyze conversation. Please try again later.",
    };
  }
}
