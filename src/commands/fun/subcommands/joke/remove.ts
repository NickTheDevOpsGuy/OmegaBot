// src/commands/fun/subcommands/joke/remove.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { removeJoke, getJoke } from "../../../../services/joke/jokeStore.js";

export async function handleJokeRemove(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const jokeId = interaction.options.getInteger("id", true);

  // Check if in guild
  if (!interaction.inGuild() || !interaction.member) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  // At this point TypeScript knows we're in a guild
  const member = interaction.member;

  // Check if member is a GuildMember (not just a string ID)
  if (typeof member === "string") {
    await interaction.reply({
      content: "Could not verify your permissions.",
      ephemeral: true,
    });
    return;
  }

  // Check moderator role
  const modRoleId = process.env.JOKE_MODERATOR_ROLE_ID;

  // Type guard: ensure roles is GuildMemberRoleManager, not string[]
  const hasModRole =
    modRoleId && "cache" in member.roles && member.roles.cache.has(modRoleId);

  if (!hasModRole) {
    await interaction.reply({
      content: "❌ Only joke moderators can remove jokes.",
      ephemeral: true,
    });
    return;
  }

  const joke = getJoke(jokeId);

  if (!joke) {
    await interaction.reply({
      content: `Joke #${jokeId} not found.`,
      ephemeral: true,
    });
    return;
  }

  const removed = removeJoke(jokeId);

  if (removed) {
    await interaction.reply({
      content: [
        `✅ **Removed joke #${jokeId}**`,
        "",
        `Category: ${joke.category}`,
        `Text: ${joke.joke_text.substring(0, 100)}${joke.joke_text.length > 100 ? "..." : ""}`,
      ].join("\n"),
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `Failed to remove joke #${jokeId}.`,
      ephemeral: true,
    });
  }
}
