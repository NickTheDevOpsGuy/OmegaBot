// src/commands/fun/subcommands/connect4.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getStats } from "./connect4Store.js";
import { runPvP, runResume } from "./pvp.js";
import { listActiveForUser } from "../../../../../../services/games/sessionManager.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const continueFlag = interaction.options.getBoolean("continue") ?? false;
  const opponent = interaction.options.getUser("user");

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const total = stats.wins + stats.losses + stats.ties;

    await interaction.editReply(
      [
        `🔴🟡 **Connect 4 Stats for ${interaction.user}**`,
        "",
        `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
        `Win Rate: ${stats.winRate}%`,
      ].join("\n"),
    );
    return;
  }

  if (continueFlag) {
    const sessions = listActiveForUser(interaction.user.id, "connect4");
    if (sessions.length === 0) {
      await interaction.editReply(
        "You have no active Connect 4 games. Start one with `/fun connect4 user:@opponent`.",
      );
      return;
    }
    if (sessions.length === 1) {
      await runResume(interaction, sessions[0]!.gameId);
      return;
    }
    const first = sessions[0]!;
    const opponentId = first.player1Id === interaction.user.id ? first.player2Id : first.player1Id;
    const rows = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`c4:continue:${first.gameId}`)
          .setLabel("Continue most recent")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔴"),
      ),
    ];
    await interaction.editReply({
      content: `You have **${sessions.length}** active Connect 4 game(s). Latest: vs <@${opponentId}>.\n\nClick below to continue that game, or use \`/fun connect4 user:@opponent\` to start a new one.`,
      components: rows,
    });
    const msg = await interaction.fetchReply();
    if (msg && "createMessageComponentCollector" in msg) {
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });
      collector.on("collect", async (btn) => {
        const parts = btn.customId.split(":");
        if (parts[0] === "c4" && parts[1] === "continue" && parts[2]) {
          collector.stop();
          await runResume(btn, parts[2]);
        }
      });
    }
    return;
  }

  const p1 = interaction.user;
  const p2 = opponent && opponent.id !== p1.id ? opponent : null;

  if (!p2) {
    await interaction.editReply(
      "Connect 4 needs an opponent. Use: `/fun connect4 user:@someone` — or use **continue: true** to resume an active game.",
    );
    return;
  }

  if (p2.bot) {
    await interaction.editReply("You can't play against a bot!");
    return;
  }

  await runPvP(interaction, p1, p2);
}
