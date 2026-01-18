// src/commands/fun/subcommands/joke/random.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { getRandomJoke, type JokeCategory } from "../../../../services/joke/jokeStore.js";

export async function handleJokeRandom(interaction: ChatInputCommandInteraction): Promise<void> {
  const category = interaction.options.getString("category") as JokeCategory | null;
  
  const joke = getRandomJoke(category || undefined);
  
  if (!joke) {
    await interaction.reply({
      content: category 
        ? `No jokes found in the ${category} category. Add some with \`/fun joke add\`!`
        : "No jokes available yet. Add some with `/fun joke add`!",
      ephemeral: true,
    });
    return;
  }
  
  const categoryEmoji = {
    boomer: "👴",
    genx: "🎸",
    millennial: "📱",
    genz: "🔥",
    genalpha: "🧒",
    random: "🎲",
  };
  
  await interaction.reply({
    content: [
      `${categoryEmoji[joke.category]} **${joke.category.toUpperCase()} JOKE** ${categoryEmoji[joke.category]}`,
      "",
      joke.joke_text,
      "",
      `_Joke #${joke.id} • Used ${joke.usage_count} times_`,
    ].join("\n"),
  });
}
