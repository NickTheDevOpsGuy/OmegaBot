// src/commands/fun/subcommands/hangman/words.ts
// Admin-only: add/list words (HANGMAN_ADMIN_ROLE_ID).

import type { ChatInputCommandInteraction } from "discord.js";
import {
  addWord as addWordToStore,
  listWords,
  getWordCount,
  type HangmanDifficulty,
} from "./hangmanWordStore.js";

export function isHangmanAdmin(interaction: ChatInputCommandInteraction): boolean {
  const roleId = process.env.HANGMAN_ADMIN_ROLE_ID?.trim();
  if (!roleId) return false;
  if (!interaction.inGuild() || !interaction.member) return false;
  const member = interaction.member;
  const roles = "roles" in member ? member.roles : null;
  if (!roles) return false;
  if (Array.isArray(roles)) return roles.includes(roleId);
  return roles.cache?.has(roleId) ?? false;
}

export async function runWordsAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isHangmanAdmin(interaction)) {
    await interaction.editReply(
      "You need the Hangman admin role (configured via `HANGMAN_ADMIN_ROLE_ID` in .env) to add words.",
    );
    return;
  }

  const word = interaction.options.getString("word", true).trim();
  const difficulty = interaction.options.getString(
    "difficulty",
    true,
  ) as HangmanDifficulty;

  if (!/^[a-zA-Z]+$/.test(word)) {
    await interaction.editReply("Word must contain only letters (A–Z).");
    return;
  }

  const added = addWordToStore(word, difficulty, interaction.user.id);
  if (added) {
    await interaction.editReply(
      `✅ Added **${word.toLowerCase()}** as **${difficulty}**. Total words: ${getWordCount()}.`,
    );
  } else {
    await interaction.editReply(
      `That word is already in the list. Use \`/fun hangman words list\` to see existing words.`,
    );
  }
}

export async function runWordsList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isHangmanAdmin(interaction)) {
    await interaction.editReply(
      "You need the Hangman admin role to list words. Use `/fun hangman stats` for your stats.",
    );
    return;
  }

  const difficulty = interaction.options.getString(
    "difficulty",
  ) as HangmanDifficulty | null;
  const words = listWords(difficulty ?? undefined);
  const total = getWordCount();

  if (words.length === 0) {
    await interaction.editReply(
      difficulty
        ? `No **${difficulty}** words yet. Add some with \`/fun hangman words add\`.`
        : "No words in the database yet.",
    );
    return;
  }

  const byDiff = new Map<string, string[]>();
  for (const w of words) {
    const list = byDiff.get(w.difficulty) ?? [];
    list.push(w.word);
    byDiff.set(w.difficulty, list);
  }
  const lines = [`🎯 **Hangman words** (${total} total)`, ""];
  for (const diff of ["easy", "medium", "hard"] as const) {
    const arr = byDiff.get(diff);
    if (arr && arr.length > 0) {
      lines.push(
        `**${diff}** (${arr.length}): ${arr.slice(0, 20).join(", ")}${arr.length > 20 ? "…" : ""}`,
      );
    }
  }

  const text = lines.join("\n");
  if (text.length > 1900) {
    await interaction.editReply(
      `🎯 **Hangman words** (${total} total). Too many to list here; filter by difficulty or check the database.`,
    );
  } else {
    await interaction.editReply(text);
  }
}
