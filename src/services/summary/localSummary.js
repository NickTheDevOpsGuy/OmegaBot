export function localSummary(text) {
  const lines = text.split("\n");
  const count = lines.length;
  return `Summary\nMessages: ${count}`;
}
