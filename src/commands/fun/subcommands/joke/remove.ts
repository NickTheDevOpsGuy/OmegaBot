import { MessageFlags } from "discord.js";
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
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // At this point TypeScript knows we're in a guild
  const member = interaction.member;

  // Check if member is a GuildMember (not just a string ID)
  if (typeof member === "string") {
    await interaction.reply({
      content: "Could not verify your permissions.",
      flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const joke = getJoke(jokeId);

  if (!joke) {
    await interaction.reply({
      content: `Joke #${jokeId} not found.`,
      flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: `Failed to remove joke #${jokeId}.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
