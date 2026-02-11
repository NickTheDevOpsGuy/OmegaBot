// src/commands/achievements/achievements.ts
//
// Achievement system that rewards users for various activities.
//
// Achievement categories:
// - Games (9): Win milestones, game-specific achievements
// - Luck (4): Slots jackpots, coin flips
// - Dedication (4): Daily streaks, trivia mastery
// - Social (2): Quotes, giveaways
//
// Achievements are checked dynamically against the database when the
// command is run, so they unlock automatically as users play.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../services/database/db.js";
import { getTotalWins, getScalar, getCount } from "../../services/gameStats/gameStats.js";

/* -------------------------------------------------------------------------- */
/* Achievement Definitions                                                     */
/* -------------------------------------------------------------------------- */

type Achievement = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "games" | "social" | "dedication" | "luck";
  checkFn: (userId: string, db: ReturnType<typeof getDb>) => boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  // Games
  {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    emoji: "🏆",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 1,
  },
  {
    id: "ten_wins",
    name: "Getting Good",
    description: "Win 10 games total",
    emoji: "⭐",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 10,
  },
  {
    id: "fifty_wins",
    name: "Champion",
    description: "Win 50 games total",
    emoji: "🥇",
    category: "games",
    checkFn: (u, db) => getTotalWins(db, u) >= 50,
  },
  {
    id: "blackjack_natural",
    name: "Natural 21",
    description: "Get a blackjack (natural 21)",
    emoji: "🃏",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "blackjack_stats", "blackjacks") >= 1,
  },
  {
    id: "wordle_streak_7",
    name: "Wordle Wizard",
    description: "Get a 7-day Wordle streak",
    emoji: "🟩",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "wordle_stats", "max_streak") >= 7,
  },
  {
    id: "word_nerd",
    name: "Word Nerd",
    description: "Win 10 Wordle games",
    emoji: "📚",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "wordle_stats", "won") >= 10,
  },
  {
    id: "hangman_hero",
    name: "Hangman Hero",
    description: "Win 10 Hangman games",
    emoji: "🎯",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "hangman_stats", "wins") >= 10,
  },
  {
    id: "hangman_speed_demon",
    name: "Speed Demon",
    description: "Solve a Hangman game in 60 seconds or less",
    emoji: "⚡",
    category: "games",
    checkFn: (u, db) => {
      const best = getScalar(db, u, "hangman_stats", "best_time_seconds");
      return best > 0 && best <= 60;
    },
  },
  {
    id: "card_shark",
    name: "Card Shark",
    description: "Win 25 Blackjack games",
    emoji: "🦈",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "blackjack_stats", "wins") >= 25,
  },
  {
    id: "connect_master",
    name: "Connect Master",
    description: "Win 10 Connect 4 games",
    emoji: "🔴",
    category: "games",
    checkFn: (u, db) => getScalar(db, u, "connect4_stats", "wins") >= 10,
  },
  // Luck
  {
    id: "jackpot",
    name: "Jackpot!",
    description: "Hit a slot machine jackpot",
    emoji: "💎",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "jackpots") >= 1,
  },
  {
    id: "lucky_streak",
    name: "Lucky Streak",
    description: "Win slots 5 times",
    emoji: "🎰",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "wins") >= 5,
  },
  {
    id: "coin_master",
    name: "Coin Master",
    description: "Flip 100 coins",
    emoji: "🪙",
    category: "luck",
    checkFn: (u, db) => getCount(db, "coin_flips", "user_id", u) >= 100,
  },
  {
    id: "high_roller",
    name: "High Roller",
    description: "Spin the slots 100 times",
    emoji: "🎲",
    category: "luck",
    checkFn: (u, db) => getScalar(db, u, "slots_stats", "spins") >= 100,
  },
  // Dedication
  {
    id: "daily_7",
    name: "Week Warrior",
    description: "Get a 7-day daily check-in streak",
    emoji: "📅",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "daily_checkins", "best_streak") >= 7,
  },
  {
    id: "daily_30",
    name: "Month Master",
    description: "Get a 30-day daily check-in streak",
    emoji: "🔥",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "daily_checkins", "best_streak") >= 30,
  },
  {
    id: "trivia_master",
    name: "Trivia Master",
    description: "Answer 50 trivia questions correctly",
    emoji: "🧠",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "trivia_stats", "correct") >= 50,
  },
  {
    id: "trivia_streak",
    name: "On Fire",
    description: "Get a 10-question trivia streak",
    emoji: "💯",
    category: "dedication",
    checkFn: (u, db) => getScalar(db, u, "trivia_stats", "best_streak") >= 10,
  },
  // Social
  {
    id: "generous",
    name: "Generous",
    description: "Host 3 giveaways",
    emoji: "🎁",
    category: "social",
    checkFn: (u, db) => getCount(db, "giveaways", "host_id", u) >= 3,
  },
  {
    id: "quotable",
    name: "Quotable",
    description: "Have one of your quotes saved",
    emoji: "💬",
    category: "social",
    checkFn: (u, db) => getCount(db, "quotes", "author_id", u) >= 1,
  },
];

/* -------------------------------------------------------------------------- */
/* Command                                                                     */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("achievements")
  .setDescription("View your achievements and progress")
  .addUserOption((o) => o.setName("user").setDescription("User to view achievements for"))
  .addBooleanOption((o) => o.setName("private").setDescription("Only show to you"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const ephemeral = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply({ ephemeral });

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const db = getDb();

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

  // Group by category
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

  await interaction.editReply({ embeds: [embed] });
}
