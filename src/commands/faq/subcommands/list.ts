// src/commands/faq/subcommands/list.ts
//
// /faq list
//
// Responsibilities:
// - Enforce permissions via guardFaqAction
// - Parse lightweight UI options (query, tag, sort, full, limit)
// - Fetch entries from the FAQ service
// - Delegate filtering + formatting to _shared helpers
//
// Non-goals:
// - No persistence logic (store.ts)
// - No business rules (services.ts)
//
// Notes:
// - Keep this file thin so it stays easy to change the Discord UX later.

import type { ChatInputCommandInteraction } from "discord.js";
import { getAll } from "../../../services/faq/services.js";
import { guardFaqAction, formatFaqList, handleFaqSubcommandError } from "./_shared.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Guardrails first: permissions and consistent error messaging live in _shared.ts
    if (!(await guardFaqAction(interaction, "list"))) return;

    // Optional filters. These options must exist in faq.ts builder to work.
    const query = interaction.options.getString("query")?.trim() ?? "";
    const tag = interaction.options.getString("tag")?.trim() ?? "";

    // Small, safe defaults to avoid Discord message spam.
    const full = interaction.options.getBoolean("full") ?? false;
    const limitRaw = interaction.options.getInteger("limit");
    const limit = clampInt(limitRaw ?? (full ? 5 : 25), 1, full ? 10 : 50);

    // Fetch all entries from the service layer.
    // Filtering and sorting happens in formatFaqList (via _shared.ts).
    const entries = getAll();

    const text = formatFaqList(entries, {
      query: query.length ? query : undefined,
      tag: tag.length ? tag : undefined,
      limit,
      full,
    });

    await interaction.editReply(text);
  } catch (err) {
    await handleFaqSubcommandError(interaction, err, "[faq/list] failed");
  }
}

/**
 * Clamp an integer to a safe range.
 * Keeps user input from producing huge outputs or weird negatives.
 */
function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
