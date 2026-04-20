type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readRichTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((part) => readRecord(part)?.["plain_text"])
    .map((part) => readString(part))
    .filter((part): part is string => Boolean(part));
}

function readTableRowCells(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const cellLines: string[] = [];
  for (const cell of value) {
    const joined = readRichTextArray(cell).join(" ").trim();
    if (joined) cellLines.push(joined);
  }
  return cellLines;
}

export function extractPlainTextFromNotionBlocks(blocks: unknown[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const record = readRecord(block);
    if (!record) continue;

    const type = readString(record["type"]);
    if (!type) continue;

    const payload = readRecord(record[type]);
    if (!payload) continue;

    const richText = readRichTextArray(payload["rich_text"]).join(" ").trim();
    if (richText) lines.push(richText);

    const caption = readRichTextArray(payload["caption"]).join(" ").trim();
    if (caption) lines.push(caption);

    const title = readString(readRecord(payload["child_page"])?.["title"]);
    if (title) lines.push(title);

    const row = readTableRowCells(payload["cells"]).join(" | ").trim();
    if (row) lines.push(row);

    const bookmarkUrl = readString(payload["url"]);
    if (type === "bookmark" && bookmarkUrl) lines.push(bookmarkUrl);
  }

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateNotionExcerpt(text: string, maxLength = 240): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return compact.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}
