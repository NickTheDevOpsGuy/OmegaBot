import { localSummary } from "@services/summary/localSummary.js";
import { llmSummary } from "@services/summary/llmSummary.js";
import { SUMMARY_MODE } from "@config/config/env.js";

export async function summarize(text) {
  if (SUMMARY_MODE === "llm") {
    return await llmSummary(text);
  }

  return await localSummary(text);
}