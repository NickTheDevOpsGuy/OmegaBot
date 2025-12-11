export function localSummary(text: string): string {
  const lines = text.split("\n");

  const numbered = lines
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  return (
    "Recent conversation (oldest to newest):\n\n" +
    numbered
  );
}