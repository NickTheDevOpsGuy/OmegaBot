// src/commands/games/fun/subcommands/games-a/chess/chess.ts
// /fun chess – challenge someone or get links to play on Lichess.

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

const LICHESS_FRIEND = "https://lichess.org/setup/friend";
const LICHESS_COMPUTER = "https://lichess.org/computer";
const LICHESS_HOME = "https://lichess.org";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const opponent = interaction.options.getUser("opponent");
  const challenger = interaction.user;

  if (opponent?.id === challenger.id) {
    await interaction.editReply(
      "You can't challenge yourself! Try playing vs the computer.",
    );
    return;
  }

  if (opponent?.bot) {
    await interaction.editReply("Challenge a human! For bot games, use the link below.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("♟️ Chess")
    .setColor(0x7fa650)
    .setFooter({ text: "Play on Lichess – free, no account required for casual games" });

  if (opponent) {
    embed.setDescription(
      [
        `${challenger} challenges ${opponent} to a game of chess!`,
        "",
        "**Create a game and share the link:**",
        `→ [Create game](${LICHESS_FRIEND})`,
        "",
        "One of you opens the link, creates a game (time control, color), and shares the game URL with the other.",
      ].join("\n"),
    );
  } else {
    embed.setDescription(
      [
        "**Play vs computer**",
        `→ [Play vs Stockfish](${LICHESS_COMPUTER})`,
        "",
        "**Play vs a friend**",
        `→ [Create a game and share the link](${LICHESS_FRIEND})`,
        "",
        `[Lichess homepage](${LICHESS_HOME})`,
      ].join("\n"),
    );
  }

  await interaction.editReply({ embeds: [embed] });
}
