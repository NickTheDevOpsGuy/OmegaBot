import { getAll } from "../faq/services.js";
import type { FaqEntry } from "../faq/types.js";

export type WikiSourceFilter = "auto" | "faq" | "notion";

export type WikiResult = {
  source: "faq" | "notion";
  score: number;
  title: string;
  excerpt: string;
  key: string | null;
  url: string | null;
  tags: string[];
};

export type NotionSearchRunner = (
  query: string,
  limit: number,
) => Promise<Array<{ title: string; excerpt: string | null; url: string; id: string }>>;

function truncateExcerpt(text: string, maxLength = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return compact.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

function scoreMatch(query: string, value: string): number {
  const needle = query.trim().toLowerCase();
  const hay = value.trim().toLowerCase();
  if (!needle || !hay) return 0;
  if (needle === hay) return 100;
  if (hay.startsWith(needle)) return 85;
  if (hay.includes(needle)) return 65;
  return 0;
}

function scoreFaqEntry(entry: FaqEntry, query: string): number {
  const byKey = scoreMatch(query, entry.key);
  const byTitle = scoreMatch(query, entry.title);
  const tags = entry.tags.some((tag) => scoreMatch(query, tag) > 0) ? 55 : 0;
  const body = scoreMatch(query, entry.body) > 0 ? 40 : 0;

  return Math.max(byKey, byTitle, tags, body) + Math.min(entry.usageCount ?? 0, 5);
}

export function searchFaqEntriesInMemory(
  entries: FaqEntry[],
  query: string,
  limit = 5,
): WikiResult[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  return entries
    .map((entry) => ({
      entry,
      score: scoreFaqEntry(entry, cleanQuery),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.entry.usageCount ?? 0) - (a.entry.usageCount ?? 0) ||
        a.entry.key.localeCompare(b.entry.key),
    )
    .slice(0, limit)
    .map(({ entry, score }) => ({
      source: "faq" as const,
      score,
      title: entry.title,
      excerpt: truncateExcerpt(entry.body, 180),
      key: entry.key,
      url: null,
      tags: entry.tags,
    }));
}

export async function searchWiki(args: {
  query: string;
  source: WikiSourceFilter;
  limit?: number;
  notionSearch?: NotionSearchRunner;
}): Promise<{ results: WikiResult[]; notices: string[] }> {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const notices: string[] = [];
  const results: WikiResult[] = [];

  if (args.source === "auto" || args.source === "faq") {
    results.push(...searchFaqEntriesInMemory(getAll(), args.query, limit));
  }

  if (args.source === "auto" || args.source === "notion") {
    if (args.notionSearch) {
      const notionResults = await args.notionSearch(args.query, limit);
      results.push(
        ...notionResults.map((entry) => ({
          source: "notion" as const,
          score: scoreMatch(args.query, entry.title) || 50,
          title: entry.title,
          excerpt: truncateExcerpt(
            entry.excerpt ?? "No page preview available yet.",
            180,
          ),
          key: null,
          url: entry.url,
          tags: [],
        })),
      );
    } else if (args.source === "notion") {
      notices.push(
        "Notion is not configured yet. Set `NOTION_TOKEN` and `NOTION_DATABASE_ID` in `.env`.",
      );
    }
  }

  const deduped = new Map<string, WikiResult>();
  for (const result of results) {
    const key = `${result.source}:${result.key ?? result.url ?? result.title}`;
    const existing = deduped.get(key);
    if (!existing || result.score > existing.score) {
      deduped.set(key, result);
    }
  }

  const ordered = [...deduped.values()]
    .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source))
    .slice(0, limit);

  return { results: ordered, notices };
}
