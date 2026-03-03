// src/commands/achievements/embedBuilder.ts
import { EmbedBuilder, type User } from "discord.js";
import { getDb } from "../../services/database/db.js";
import { ACHIEVEMENTS, type Achievement } from "./definitions.js";

export function buildAchievementsEmbed(
  targetUser: User,
  db: ReturnType<typeof getDb>,
): EmbedBuilder {
  const earned: Achievement[] = [];
  const locked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    try {
      if (achievement.checkFn(targetUser.id, db)) {
        earned.push(achievement);
      } else {
        locked.push(achievement);
      }
    } catch {
      locked.push(achievement);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Achievements for ${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setColor(0xffd700)
    .setFooter({ text: `${earned.length}/${ACHIEVEMENTS.length} unlocked` });

  const categories = ["games", "luck", "dedication", "social"] as const;
  const categoryNames: Record<(typeof categories)[number], string> = {
    games: "🎮 Games",
    luck: "🍀 Luck",
    dedication: "💪 Dedication",
    social: "💬 Social",
  };

  for (const category of categories) {
    const categoryEarned = earned.filter((a) => a.category === category);
    const categoryLocked = locked.filter((a) => a.category === category);

    if (categoryEarned.length === 0 && categoryLocked.length === 0) continue;

    const lines: string[] = [];
    for (const a of categoryEarned) {
      lines.push(`${a.emoji} **${a.name}** - ${a.description}`);
    }
    for (const a of categoryLocked) {
      lines.push(`🔒 ~~${a.name}~~ - ${a.description}`);
    }

    embed.addFields({
      name: `${categoryNames[category]} (${categoryEarned.length}/${categoryEarned.length + categoryLocked.length})`,
      value: lines.join("\n") || "None",
      inline: false,
    });
  }

  if (earned.length === 0) {
    embed.setDescription("No achievements unlocked yet. Start playing to earn some!");
  }

  return embed;
}
