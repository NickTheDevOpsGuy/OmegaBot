import { env } from "../../config/env.js";
import { localSummary } from "./localSummary.js";
import { llmSummary } from "./llmSummary.js";

export async function summarize(text) {
  if (env.summaryMode === "local") return localSummary(text);
  return llmSummary(text);
}
