// src/commands/fun/subcommands/joke/remove.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { t, resolveLocale } from "../../../../../../i18n/index.js";
import { removeJoke, getJoke } from "../../../../../../services/stores/joke/jokeStore.js";

export async function handleJokeRemove(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const jokeId = interaction.options.getInteger("id", true);
  const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);

  // Check if in guild
  if (!interaction.inGuild() || !interaction.member) {
    await interaction.editReply({
      content: t("common.guild_only", locale),
    });
    return;
  }

  // At this point TypeScript knows we're in a guild
  const member = interaction.member;

  // Check if member is a GuildMember (not just a string ID)
  if (typeof member === "string") {
    await interaction.editReply({
      content: "Could not verify your permissions.",
    });
    return;
  }

  // Check moderator role
  const modRoleId = process.env.JOKE_MODERATOR_ROLE_ID;

  // Type guard: ensure roles is GuildMemberRoleManager, not string[]
  const hasModRole =
    modRoleId && "cache" in member.roles && member.roles.cache.has(modRoleId);

  if (!hasModRole) {
    await interaction.editReply({
      content: "❌ Only joke moderators can remove jokes.",
    });
    return;
  }

  const joke = getJoke(jokeId);

  if (!joke) {
    await interaction.editReply({
      content: `Joke #${jokeId} not found.`,
    });
    return;
  }

  const removed = removeJoke(jokeId);

  if (removed) {
    await interaction.editReply({
      content: [
        `✅ **Removed joke #${jokeId}**`,
        "",
        `Category: ${joke.category}`,
        `Text: ${joke.joke_text.substring(0, 100)}${joke.joke_text.length > 100 ? "..." : ""}`,
      ].join("\n"),
    });
  } else {
    await interaction.editReply({
      content: `Failed to remove joke #${jokeId}.`,
    });
  }
}
