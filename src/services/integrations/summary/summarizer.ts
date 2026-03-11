import { env } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";
import { localSummary } from "./localSummary.js";
import { llmSummary } from "./llmSummary.js";

/**
 * Decide which summarization method to use (LLM or local) based on configuration.
 * Falls back to local summary if LLM API is unavailable.
 */
export async function summarize(text: string): Promise<string> {
  if (env.summaryMode === "llm") {
    try {
      return await llmSummary(text);
    } catch (err) {
      logger.warn({ err }, "[summary] LLM failed, falling back to local");
      return localSummary(text);
    }
  }
  return localSummary(text);
}
