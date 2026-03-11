// src/commands/faq/subcommands/_shared.ts
//
// Shared helpers for /faq subcommands.
//
// Goals:
// - Keep each subcommand tiny and consistent
// - Centralize common parsing, formatting, and guardrails
// - Provide one place to evolve list filtering and output style
//
// Non-goals:
// - No file I/O
// - No persistence logic
// - No Discord lifecycle (defer/reply) decisions

import type { ChatInputCommandInteraction } from "discord.js";
import { getContextLogger } from "../../core/logging/requestContext.js";
import { t, resolveLocale } from "../../../i18n/index.js";

import { canFaqAction } from "./permissions.js";
import { MAX_KEY_LEN } from "./types.js";
import type { FaqEntry } from "./types.js";

export type FaqAction = "add" | "get" | "list" | "remove";

/**
 * Optional list filtering and display preferences.
 *
 * - query: substring search across key/title/body/tags (case-insensitive)
 * - tag: filter to entries that include this tag (case-insensitive)
 * - limit: max entries to render
 * - full: if true, render full FAQ bodies instead of one-line rows
 * - sort: how to order results
 */
export type FaqListFilter = {
  query?: string;
  tag?: string;
  limit?: number;
  full?: boolean;
  sort?: "usage" | "updated" | "key";
};

export async function guardFaqAction(
  interaction: ChatInputCommandInteraction,
  action: FaqAction,
): Promise<boolean> {
  const perm = canFaqAction(interaction, action);
  if (perm.ok) return true;

  const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
  const msg =
    "reason" in perm ? t(perm.reason, locale) : t("error.generic", locale);
  await interaction.editReply("❌ " + msg);
  return false;
}

/**
 * Read and minimally validate a required key option.
 *
 * Notes:
 * - This is intentionally a light guardrail for user experience.
 * - The service layer is still the source of truth for normalization/validation.
 */
export async function readRequiredKey(
  interaction: ChatInputCommandInteraction,
  optionName = "key",
): Promise<string | null> {
  const rawKey = interaction.options.getString(optionName, true);
  const key = rawKey.trim();
  const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);

  if (key.length === 0) {
    await interaction.editReply("❌ " + t("faq.key_empty", locale));
    return null;
  }

  if (key.length > MAX_KEY_LEN) {
    await interaction.editReply(
      "❌ " + t("faq.key_too_long", locale, { max: String(MAX_KEY_LEN) }),
    );
    return null;
  }

  return key;
}

/**
 * Parse a comma-separated tags string into a clean array.
 * Example: "devops, ci/cd,  bot " -> ["devops","ci/cd","bot"]
 */
export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Format a single FAQ entry for Discord.
 *
 * Output style:
 * - Key (bold)
 * - Title (bold)
 * - Body
 * - Tags line only when present
 */
export function formatFaqEntry(entry: FaqEntry): string {
  const tagsLine = entry.tags?.length ? `🏷️ ${entry.tags.join(", ")}` : null;

  return [`📌 **${entry.key}**`, `**${entry.title}**`, entry.body, tagsLine]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format a list view.
 *
 * Default behavior:
 * - Returns a scannable list of keys with a small hint (first tag, usage)
 *
 * If filter.full is true:
 * - Returns full entry blocks (key/title/body/tags) for each match
 */
export function formatFaqList(entries: FaqEntry[], filter: FaqListFilter = {}): string {
  if (entries.length === 0) {
    return "No FAQs yet. Add one with `/faq add`.";
  }

  const limit = typeof filter.limit === "number" ? filter.limit : 25;

  const filtered = applyListFilters(entries, filter);
  if (filtered.length === 0) {
    const bits: string[] = ["No FAQs matched."];
    if (filter.tag) bits.push(`Tag filter: **${filter.tag}**`);
    if (filter.query) bits.push(`Query: **${filter.query}**`);
    return bits.join("\n");
  }

  const sorted = applyListSort(filtered, filter.sort);

  const shown = sorted.slice(0, limit);
  const remaining = sorted.length - shown.length;

  // Full mode: show each full entry block
  if (filter.full) {
    const blocks = shown.map((e) => formatFaqEntry(e));
    const footer =
      remaining > 0 ? `\n\n…plus ${remaining} more. Narrow filters to see more.` : "";
    return [`📚 **FAQ entries** (${filtered.length})`, "", ...joinBlocks(blocks), footer]
      .filter(Boolean)
      .join("\n");
  }

  // Compact mode: one line per entry
  const lines = shown.map((e) => {
    const tagHint = e.tags?.length ? ` — ${e.tags[0]}` : "";
    const used = typeof e.usageCount === "number" ? ` • ${e.usageCount} uses` : "";
    return `• **${e.key}**${tagHint}${used}`;
  });

  const moreLine = remaining > 0 ? `\n…plus ${remaining} more.` : "";

  return [`📚 **FAQ entries** (${filtered.length})`, ...lines, moreLine]
    .filter(Boolean)
    .join("\n");
}

/**
 * Centralized error handler for subcommands.
 * Keeps user messaging consistent and logs useful context.
 */
export async function handleFaqSubcommandError(
  interaction: ChatInputCommandInteraction,
  err: unknown,
  tag: string,
): Promise<void> {
  getContextLogger().error({ err }, tag);
  await interaction.editReply("❌ Something went wrong. Try again in a bit.");
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

function applyListFilters(entries: FaqEntry[], filter: FaqListFilter): FaqEntry[] {
  let out = entries;

  // Tag filter (case-insensitive exact match against any tag)
  if (filter.tag && filter.tag.trim().length > 0) {
    const wanted = filter.tag.trim().toLowerCase();
    out = out.filter((e) => (e.tags ?? []).some((t) => t.toLowerCase() === wanted));
  }

  // Query filter (case-insensitive substring match)
  if (filter.query && filter.query.trim().length > 0) {
    const q = filter.query.trim().toLowerCase();

    out = out.filter((e) => {
      const hay = [e.key, e.title, e.body, ...(e.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }

  return out;
}

function applyListSort(entries: FaqEntry[], sort: FaqListFilter["sort"]): FaqEntry[] {
  const mode = sort ?? "usage";

  if (mode === "key") {
    return [...entries].sort((a, b) => a.key.localeCompare(b.key));
  }

  if (mode === "updated") {
    return [...entries].sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }

  // default: usage desc, then updated desc, then key asc
  return [...entries].sort((a, b) => {
    const u = (b.usageCount ?? 0) - (a.usageCount ?? 0);
    if (u !== 0) return u;

    const t = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    if (t !== 0) return t;

    return a.key.localeCompare(b.key);
  });
}

function joinBlocks(blocks: string[]): string[] {
  // Add a simple divider between full entries for readability.
  // Discord does not have a native horizontal rule, so we use a line.
  const out: string[] = [];
  blocks.forEach((b, idx) => {
    if (idx > 0) out.push("────────");
    out.push(b);
  });
  return out;
}
