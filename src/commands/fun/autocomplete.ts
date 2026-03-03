// src/commands/fun/autocomplete.ts
// Fun command autocomplete: reminders (cancel id), quotes (remove id).

import type { AutocompleteInteraction } from "discord.js";
import { listPendingRemindersByUser } from "../../services/reminders/store.js";
import type { ReminderRow } from "../../services/reminders/store.js";
import {
  listRecentQuotesForAutocomplete,
  type QuoteAutocompleteItem,
} from "../../services/quotes/quoteStore.js";

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused(true);

  if (
    group === "remind" &&
    (sub === "cancel" || sub === "snooze") &&
    focused.name === "id"
  ) {
    const reminders = listPendingRemindersByUser(interaction.user.id);
    const needle = String(focused.value || "")
      .trim()
      .toLowerCase();
    const choices = reminders
      .filter(
        (r: ReminderRow) =>
          !needle ||
          String(r.id).includes(needle) ||
          r.message.toLowerCase().includes(needle),
      )
      .slice(0, 25)
      .map((r: ReminderRow) => ({
        name: `#${r.id}: ${r.message.slice(0, 60)}${r.message.length > 60 ? "…" : ""}`,
        value: r.id,
      }));
    await interaction.respond(
      choices.length ? choices : [{ name: "No pending reminders", value: 0 }],
    );
    return;
  }

  if (group === "quote" && sub === "remove" && focused.name === "id") {
    if (!interaction.guildId) {
      await interaction.respond([{ name: "Use in a server to remove quotes", value: 0 }]);
      return;
    }
    const quotes = listRecentQuotesForAutocomplete(interaction.guildId);
    const needle = String(focused.value || "")
      .trim()
      .toLowerCase();
    const choices = quotes
      .filter(
        (q: QuoteAutocompleteItem) =>
          !needle ||
          String(q.id).includes(needle) ||
          q.preview.toLowerCase().includes(needle),
      )
      .slice(0, 25)
      .map((q: QuoteAutocompleteItem) => ({
        name: `#${q.id}: ${q.preview}`,
        value: q.id,
      }));
    await interaction.respond(
      choices.length ? choices : [{ name: "No quotes found", value: 0 }],
    );
    return;
  }

  await interaction.respond([]);
}
