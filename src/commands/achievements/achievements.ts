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
    checkFn: (userId, db) => {
      const tables = ["rps_stats", "ttt_stats", "blackjack_stats", "hangman_stats"];
      for (const table of tables) {
        try {
          const row = db
            .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
            .get(userId) as { wins: number } | undefined;
          if (row && row.wins > 0) return true;
        } catch {
          /* table might not exist */
        }
      }
      return false;
    },
  },
  {
    id: "ten_wins",
    name: "Getting Good",
    description: "Win 10 games total",
    emoji: "⭐",
    category: "games",
    checkFn: (userId, db) => {
      let total = 0;
      const tables = ["rps_stats", "ttt_stats", "blackjack_stats", "hangman_stats"];
      for (const table of tables) {
        try {
          const row = db
            .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
            .get(userId) as { wins: number } | undefined;
          if (row) total += row.wins;
        } catch {
          /* table might not exist */
        }
      }
      return total >= 10;
    },
  },
  {
    id: "fifty_wins",
    name: "Champion",
    description: "Win 50 games total",
    emoji: "🥇",
    category: "games",
    checkFn: (userId, db) => {
      let total = 0;
      const tables = ["rps_stats", "ttt_stats", "blackjack_stats", "hangman_stats"];
      for (const table of tables) {
        try {
          const row = db
            .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
            .get(userId) as { wins: number } | undefined;
          if (row) total += row.wins;
        } catch {
          /* table might not exist */
        }
      }
      return total >= 50;
    },
  },
  {
    id: "blackjack_natural",
    name: "Natural 21",
    description: "Get a blackjack (natural 21)",
    emoji: "🃏",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT blackjacks FROM blackjack_stats WHERE user_id = ?`)
          .get(userId) as { blackjacks: number } | undefined;
        return (row?.blackjacks ?? 0) >= 1;
      } catch {
        return false;
      }
    },
  },
  {
    id: "wordle_streak_7",
    name: "Wordle Wizard",
    description: "Get a 7-day Wordle streak",
    emoji: "🟩",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT max_streak FROM wordle_stats WHERE user_id = ?`)
          .get(userId) as { max_streak: number } | undefined;
        return (row?.max_streak ?? 0) >= 7;
      } catch {
        return false;
      }
    },
  },

  // Luck
  {
    id: "jackpot",
    name: "Jackpot!",
    description: "Hit a slot machine jackpot",
    emoji: "💎",
    category: "luck",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT jackpots FROM slots_stats WHERE user_id = ?`)
          .get(userId) as { jackpots: number } | undefined;
        return (row?.jackpots ?? 0) >= 1;
      } catch {
        return false;
      }
    },
  },
  {
    id: "lucky_streak",
    name: "Lucky Streak",
    description: "Win slots 5 times",
    emoji: "🎰",
    category: "luck",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT wins FROM slots_stats WHERE user_id = ?`)
          .get(userId) as { wins: number } | undefined;
        return (row?.wins ?? 0) >= 5;
      } catch {
        return false;
      }
    },
  },
  {
    id: "coin_master",
    name: "Coin Master",
    description: "Flip 100 coins",
    emoji: "🪙",
    category: "luck",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ?`)
          .get(userId) as { count: number };
        return row.count >= 100;
      } catch {
        return false;
      }
    },
  },

  // Dedication
  {
    id: "daily_7",
    name: "Week Warrior",
    description: "Get a 7-day daily check-in streak",
    emoji: "📅",
    category: "dedication",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`)
          .get(userId) as { best_streak: number } | undefined;
        return (row?.best_streak ?? 0) >= 7;
      } catch {
        return false;
      }
    },
  },
  {
    id: "daily_30",
    name: "Month Master",
    description: "Get a 30-day daily check-in streak",
    emoji: "🔥",
    category: "dedication",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`)
          .get(userId) as { best_streak: number } | undefined;
        return (row?.best_streak ?? 0) >= 30;
      } catch {
        return false;
      }
    },
  },
  {
    id: "trivia_master",
    name: "Trivia Master",
    description: "Answer 50 trivia questions correctly",
    emoji: "🧠",
    category: "dedication",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT correct FROM trivia_stats WHERE user_id = ?`)
          .get(userId) as { correct: number } | undefined;
        return (row?.correct ?? 0) >= 50;
      } catch {
        return false;
      }
    },
  },
  {
    id: "trivia_streak",
    name: "On Fire",
    description: "Get a 10-question trivia streak",
    emoji: "💯",
    category: "dedication",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT best_streak FROM trivia_stats WHERE user_id = ?`)
          .get(userId) as { best_streak: number } | undefined;
        return (row?.best_streak ?? 0) >= 10;
      } catch {
        return false;
      }
    },
  },
  {
    id: "high_roller",
    name: "High Roller",
    description: "Spin the slots 100 times",
    emoji: "🎲",
    category: "luck",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT spins FROM slots_stats WHERE user_id = ?`)
          .get(userId) as { spins: number } | undefined;
        return (row?.spins ?? 0) >= 100;
      } catch {
        return false;
      }
    },
  },
  {
    id: "word_nerd",
    name: "Word Nerd",
    description: "Win 10 Wordle games",
    emoji: "📚",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT won FROM wordle_stats WHERE user_id = ?`)
          .get(userId) as { won: number } | undefined;
        return (row?.won ?? 0) >= 10;
      } catch {
        return false;
      }
    },
  },
  {
    id: "hangman_hero",
    name: "Hangman Hero",
    description: "Win 10 Hangman games",
    emoji: "🎯",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT wins FROM hangman_stats WHERE user_id = ?`)
          .get(userId) as { wins: number } | undefined;
        return (row?.wins ?? 0) >= 10;
      } catch {
        return false;
      }
    },
  },
  {
    id: "card_shark",
    name: "Card Shark",
    description: "Win 25 Blackjack games",
    emoji: "🦈",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT wins FROM blackjack_stats WHERE user_id = ?`)
          .get(userId) as { wins: number } | undefined;
        return (row?.wins ?? 0) >= 25;
      } catch {
        return false;
      }
    },
  },
  {
    id: "connect_master",
    name: "Connect Master",
    description: "Win 10 Connect 4 games",
    emoji: "🔴",
    category: "games",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT wins FROM connect4_stats WHERE user_id = ?`)
          .get(userId) as { wins: number } | undefined;
        return (row?.wins ?? 0) >= 10;
      } catch {
        return false;
      }
    },
  },
  {
    id: "generous",
    name: "Generous",
    description: "Host 3 giveaways",
    emoji: "🎁",
    category: "social",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT COUNT(*) as count FROM giveaways WHERE host_id = ?`)
          .get(userId) as { count: number };
        return row.count >= 3;
      } catch {
        return false;
      }
    },
  },

  // Social
  {
    id: "quotable",
    name: "Quotable",
    description: "Have one of your quotes saved",
    emoji: "💬",
    category: "social",
    checkFn: (userId, db) => {
      try {
        const row = db
          .prepare(`SELECT COUNT(*) as count FROM quotes WHERE author_id = ?`)
          .get(userId) as { count: number };
        return row.count >= 1;
      } catch {
        return false;
      }
    },
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
