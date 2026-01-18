// src/commands/fun/subcommands/joke/index.ts
import { SlashCommandSubcommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { JOKE_CATEGORIES } from "../../../../services/joke/jokeStore.js";
import { handleJokeRandom } from "./random.js";
import { handleJokeAdd } from "./add.js";
import { handleJokeRemove } from "./remove.js";
import { handleJokeList } from "./list.js";

export function buildJokeSubcommands(subcommandGroup: any) {
  return subcommandGroup
    .setName("joke")
    .setDescription("User-submitted jokes by generation")
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName("random")
        .setDescription("Get a random joke")
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("Joke category (generation)")
            .setRequired(false)
            .addChoices(...JOKE_CATEGORIES.map((cat) => ({ name: cat, value: cat }))),
        ),
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName("add")
        .setDescription("Add a new joke")
        .addStringOption((opt) =>
          opt.setName("text").setDescription("The joke text").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("Joke category (generation)")
            .setRequired(true)
            .addChoices(...JOKE_CATEGORIES.map((cat) => ({ name: cat, value: cat }))),
        ),
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName("remove")
        .setDescription("Remove a joke (moderators only)")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("Joke ID to remove").setRequired(true),
        ),
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName("list")
        .setDescription("List recent jokes")
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("Filter by category")
            .setRequired(false)
            .addChoices(...JOKE_CATEGORIES.map((cat) => ({ name: cat, value: cat }))),
        ),
    );
}

export async function handleJoke(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "random":
      await handleJokeRandom(interaction);
      break;
    case "add":
      await handleJokeAdd(interaction);
      break;
    case "remove":
      await handleJokeRemove(interaction);
      break;
    case "list":
      await handleJokeList(interaction);
      break;
    default:
      await interaction.reply({
        content: "Unknown subcommand",
        ephemeral: true,
      });
  }
}
