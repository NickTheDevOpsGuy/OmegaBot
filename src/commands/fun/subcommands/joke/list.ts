// src/commands/fun/subcommands/joke/list.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listJokes, getJokeStats, type JokeCategory } from "../../../../services/joke/jokeStore.js";

export async function handleJokeList(interaction: ChatInputCommandInteraction): Promise<void> {
  const category = interaction.options.getString("category") as JokeCategory | null;
  
  const jokes = listJokes(category || undefined, 10);
  const stats = getJokeStats();
  
  if (jokes.length === 0) {
    await interaction.reply({
      content: category
        ? `No jokes in the ${category} category yet.`
        : "No jokes added yet. Be the first with `/fun joke add`!",
      ephemeral: true,
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(category ? `${category.toUpperCase()} Jokes` : "All Jokes")
    .setDescription(
      jokes.map(j => 
        `**#${j.id}** [${j.category}] - ${j.joke_text.substring(0, 60)}${j.joke_text.length > 60 ? "..." : ""} (${j.usage_count} uses)`
      ).join("\n")
    )
    .setFooter({ 
      text: category
        ? `Showing ${jokes.length} of ${stats.byCategory[category] || 0} ${category} jokes`
        : `Showing ${jokes.length} of ${stats.total} total jokes`
    })
    .setColor(0x00AE86);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
