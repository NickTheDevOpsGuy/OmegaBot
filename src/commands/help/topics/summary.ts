export function buildSummaryHelp(): string {
  return [
    "**Help: Summary & History**",
    "",
    "`/summary`     Get a summary of recent channel messages (DM'd to you)",
    "`/history`     Get raw recent messages (DM'd, no AI)",
    "",
    "**Summary modes** (set in .env):",
    "• `SUMMARY_MODE=local` – Fast, free, basic summarization",
    "• `SUMMARY_MODE=llm` – Higher quality via OpenAI (requires OPENAI_API_KEY)",
    "",
    "Use `private:true` so only you see the command result.",
  ].join("\n");
}
