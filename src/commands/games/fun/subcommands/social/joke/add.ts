// src/commands/fun/subcommands/joke/add.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { addJoke, type JokeCategory } from "../../../../../../services/stores/joke/jokeStore.js";

export async function handleJokeAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const jokeText = interaction.options.getString("text", true);
  const category = interaction.options.getString("category", true) as JokeCategory;

  if (jokeText.length > 1000) {
    await interaction.editReply({
      content: "Joke is too long! Keep it under 1000 characters.",
    });
    return;
  }

  const joke = addJoke(jokeText, category, interaction.user.id);

  await interaction.editReply({
    content: [
      "✅ **Joke added!**",
      "",
      `Category: ${category}`,
      `Joke #${joke.id}`,
      "",
      joke.joke_text,
    ].join("\n"),
  });
}
