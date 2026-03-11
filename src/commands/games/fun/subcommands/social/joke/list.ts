// src/commands/fun/subcommands/joke/list.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import {
  listJokes,
  getJokeStats,
  type JokeCategory,
} from "../../../../../../services/stores/joke/jokeStore.js";

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

export async function handleJokeList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const category = interaction.options.getString("category") as JokeCategory | null;

  const jokes = listJokes(category || undefined, 10);
  const stats = getJokeStats();

  if (jokes.length === 0) {
    await interaction.editReply({
      content: category
        ? `No jokes in the ${category} category yet.`
        : "No jokes added yet. Be the first with `/fun joke add`!",
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(
      category
        ? `${categoryEmoji[category]} ${category.toUpperCase()} Jokes`
        : "🎭 All Jokes",
    )
    .setDescription(
      jokes
        .map((j) => {
          const emoji = categoryEmoji[j.category] || "🎭";
          const preview = j.joke_text.substring(0, 60);
          const truncated = j.joke_text.length > 60 ? "..." : "";
          return `${emoji} **#${j.id}** ${preview}${truncated}\n_${j.category} • ${j.usage_count} uses_`;
        })
        .join("\n\n"),
    )
    .setFooter({
      text: category
        ? `Showing ${jokes.length} of ${stats.byCategory[category] || 0} ${category} jokes`
        : `Showing ${jokes.length} of ${stats.total} total jokes`,
    })
    .setColor(0xffd700); // Gold color for fun commands

  await interaction.editReply({ embeds: [embed] });
}
