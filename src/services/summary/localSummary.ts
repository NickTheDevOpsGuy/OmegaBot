export function localSummary(text: string): string {
  const lines = text.split("\n");
  const total = lines.length;

  const users = new Set<string>();
  let longest = "";
  const keywords: Record<string, number> = {};

  for (const line of lines) {
    const [user, msg] = line.split(": ");
    if (user) users.add(user);

    if (msg && msg.length > longest.length) {
      longest = msg;
    }

    if (msg) {
      msg.split(/\s+/).forEach(word => {
        const w = word.toLowerCase();
        if (!w) return;
        if (!keywords[w]) keywords[w] = 0;
        keywords[w]++;
      });
    }
  }

  const topWords = Object.entries(keywords)
    .filter(([k]) => k.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w, c]) => `${w} (${c})`)
    .join(", ");

  return (
    "Summary of recent messages:\n" +
    `Messages: ${total}\n` +
    `Participants: ${users.size}\n` +
    `Top words: ${topWords || "none"}\n\n` +
    `Most detailed message:\n${longest}`
  );
}
