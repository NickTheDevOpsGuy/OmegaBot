/*
 * Produce a simple heuristic summary of recent messages by counting:
 * - total messages
 * - unique participants
 * - frequent words
 * - the longest (most detailed) message
 */
export function localSummary(text: string): string {
  const lines = text.split("\n");
  const total = lines.length;

  const users = new Set<string>();
  let longest = "";
  const keywords: Record<string, number> = {};

  /*
   * Iterate through each line and extract metadata for the summary.
   * Expected format per line: "username: message text"
   */
  for (const line of lines) {
    /*
     * Separate the username and message content.
     */
    const [user, msg] = line.split(": ");
    if (user) {
      users.add(user);
    }

    /*
     * Track the longest message so we can surface it as the detailed example.
     */
    if (msg && msg.length > longest.length) {
      longest = msg;
    }

    /*
     * Break the message into lowercase words and count how often each appears.
     */
    if (msg) {
      msg.split(/\s+/).forEach((word) => {
        const w = word.toLowerCase();
        if (!w) return;
        if (!keywords[w]) {
          keywords[w] = 0;
        }
        keywords[w]++;
      });
    }
  }

  /*
   * Select the top 5 most frequent meaningful words to highlight in the summary.
   * We ignore very short tokens (length <= 3) to skip things like "the", "and".
   */
  const topWords = Object.entries(keywords)
    .filter(([k]) => k.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w, c]) => `${w} (${c})`)
    .join(", ");

  /*
   * Produce the final formatted summary string returned to the user.
   */
  return (
    "Summary of recent messages:\n" +
    `Messages: ${total}\n` +
    `Participants: ${users.size}\n` +
    `Top words: ${topWords || "none"}\n\n` +
    `Most detailed message:\n${longest}`
  );
}
