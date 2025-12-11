/*
 * Select the top 5 most frequent meaningful words to highlight in the summary.
 */
export function localSummary(text: string): string {
  const lines = text.split("\n");
  const total = lines.length;

  const users = new Set<string>();
  let longest = "";
  const keywords: Record<string, number> = {};

  /*
   * Iterate through each message and extract metadata for the summary.
   */
  for (const line of lines) {
    /*
     * Separate the username and message content (format: “user: message”).
     */
    const [user, msg] = line.split(": ");
    if (user) users.add(user);

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
        if (!keywords[w]) keywords[w] = 0;
        keywords[w]++;
      });
    }
  }

  /*
   * Break the message into lowercase words and count how often each appears.
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
