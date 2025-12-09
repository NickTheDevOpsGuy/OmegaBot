import { env } from "../../config/env.js";
import { localSummary } from "./localSummary.js";
import { llmSummary } from "./llmSummary.js";

export async function summarize(text: string): Promise<string> {
  if (env.summaryMode === "llm") {
    return llmSummary(text);
  }

  return localSummary(text);
}
