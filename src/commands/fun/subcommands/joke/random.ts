// src/commands/fun/subcommands/joke/random.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { getRandomJoke, type JokeCategory } from "../../../../services/joke/jokeStore.js";

const categoryEmoji: Record<JokeCategory, string> = {
  boomer: "👴",
  genx: "🎸",
  millennial: "📱",
  genz: "🔥",
  genalpha: "🧒",
  random: "🎲",
  tech: "💻",
  dark: "🌑",
  wholesome: "🌈",
  anti: "🤷",
  puns: "🎭",
  observational: "🔍",
  dad: "👨",
};

export async function handleJokeRandom(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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

  const emoji = categoryEmoji[joke.category] || "🎭";

  await interaction.reply({
    content: [
      `${emoji} **${joke.category.toUpperCase()} JOKE** ${emoji}`,
      "",
      joke.joke_text,
      "",
      `_Joke #${joke.id} • Used ${joke.usage_count} times_`,
    ].join("\n"),
  });
}
