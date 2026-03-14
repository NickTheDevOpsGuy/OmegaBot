import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDailyQuestBoard } from "../../../../../../services/stores/progression/questStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const board = getDailyQuestBoard(interaction.user.id);

  const lines = board.quests.map((quest) => {
    const status = quest.claimed ? "✅" : quest.completed ? "🎁" : "🕒";
    return `${status} ${quest.label}\nProgress: **${quest.current}/${quest.target}** • Reward: **${quest.rewardXp} XP**`;
  });

  const footer = [
    board.newlyClaimedXp > 0
      ? `Auto-claimed ${board.newlyClaimedXp} XP from completed quests.`
      : undefined,
    board.levelUpLines.length > 0 ? board.levelUpLines.join(" ") : undefined,
    "Quests rotate daily based on UTC date.",
  ]
    .filter(Boolean)
    .join(" ");

  const embed = new EmbedBuilder()
    .setTitle("🎯 Daily Quests")
    .setDescription(lines.join("\n\n"))
    .setColor(0xf59e0b)
    .setFooter({ text: footer });

  await interaction.editReply({ embeds: [embed] });
}
