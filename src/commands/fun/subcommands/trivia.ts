// src/commands/fun/subcommands/trivia.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

type TriviaCategory =
  | "general"
  | "science"
  | "history"
  | "geography"
  | "entertainment"
  | "sports";

type Difficulty = "easy" | "medium" | "hard";

interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  category: TriviaCategory;
  difficulty: Difficulty;
}

const CATEGORY_EMOJI: Record<TriviaCategory, string> = {
  general: "🎯",
  science: "🔬",
  history: "📜",
  geography: "🌍",
  entertainment: "🎬",
  sports: "⚽",
};

const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

const TRIVIA_TIMEOUT_MS = 30_000; // 30 seconds

// Built-in trivia questions
const QUESTIONS: TriviaQuestion[] = [
  // General
  {
    question: "What is the largest planet in our solar system?",
    correctAnswer: "Jupiter",
    wrongAnswers: ["Saturn", "Neptune", "Uranus"],
    category: "general",
    difficulty: "easy",
  },
  {
    question: "How many continents are there on Earth?",
    correctAnswer: "7",
    wrongAnswers: ["5", "6", "8"],
    category: "general",
    difficulty: "easy",
  },
  {
    question: "What is the chemical symbol for gold?",
    correctAnswer: "Au",
    wrongAnswers: ["Ag", "Go", "Gd"],
    category: "general",
    difficulty: "medium",
  },
  {
    question: "Which planet is known as the Red Planet?",
    correctAnswer: "Mars",
    wrongAnswers: ["Venus", "Mercury", "Jupiter"],
    category: "general",
    difficulty: "easy",
  },
  {
    question: "What is the hardest natural substance on Earth?",
    correctAnswer: "Diamond",
    wrongAnswers: ["Titanium", "Quartz", "Obsidian"],
    category: "general",
    difficulty: "easy",
  },

  // Science
  {
    question: "What is the powerhouse of the cell?",
    correctAnswer: "Mitochondria",
    wrongAnswers: ["Nucleus", "Ribosome", "Golgi apparatus"],
    category: "science",
    difficulty: "easy",
  },
  {
    question: "What is the speed of light in a vacuum (approx)?",
    correctAnswer: "300,000 km/s",
    wrongAnswers: ["150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    category: "science",
    difficulty: "medium",
  },
  {
    question: "What particle has a positive charge?",
    correctAnswer: "Proton",
    wrongAnswers: ["Electron", "Neutron", "Photon"],
    category: "science",
    difficulty: "easy",
  },
  {
    question: "What is the atomic number of Carbon?",
    correctAnswer: "6",
    wrongAnswers: ["8", "12", "4"],
    category: "science",
    difficulty: "medium",
  },
  {
    question: "Who developed the theory of general relativity?",
    correctAnswer: "Albert Einstein",
    wrongAnswers: ["Isaac Newton", "Niels Bohr", "Stephen Hawking"],
    category: "science",
    difficulty: "easy",
  },

  // History
  {
    question: "In what year did World War II end?",
    correctAnswer: "1945",
    wrongAnswers: ["1944", "1946", "1943"],
    category: "history",
    difficulty: "easy",
  },
  {
    question: "Who was the first President of the United States?",
    correctAnswer: "George Washington",
    wrongAnswers: ["Thomas Jefferson", "John Adams", "Benjamin Franklin"],
    category: "history",
    difficulty: "easy",
  },
  {
    question: "What ancient wonder was located in Alexandria, Egypt?",
    correctAnswer: "The Lighthouse",
    wrongAnswers: ["The Colossus", "The Hanging Gardens", "The Mausoleum"],
    category: "history",
    difficulty: "hard",
  },
  {
    question: "Which empire built Machu Picchu?",
    correctAnswer: "Inca Empire",
    wrongAnswers: ["Aztec Empire", "Maya Civilization", "Olmec Civilization"],
    category: "history",
    difficulty: "medium",
  },
  {
    question: "The French Revolution began in what year?",
    correctAnswer: "1789",
    wrongAnswers: ["1776", "1799", "1804"],
    category: "history",
    difficulty: "medium",
  },

  // Geography
  {
    question: "What is the capital of Australia?",
    correctAnswer: "Canberra",
    wrongAnswers: ["Sydney", "Melbourne", "Perth"],
    category: "geography",
    difficulty: "medium",
  },
  {
    question: "Which is the longest river in the world?",
    correctAnswer: "Nile",
    wrongAnswers: ["Amazon", "Yangtze", "Mississippi"],
    category: "geography",
    difficulty: "medium",
  },
  {
    question: "What is the smallest country in the world?",
    correctAnswer: "Vatican City",
    wrongAnswers: ["Monaco", "San Marino", "Liechtenstein"],
    category: "geography",
    difficulty: "easy",
  },
  {
    question: "Mount Everest is located in which mountain range?",
    correctAnswer: "Himalayas",
    wrongAnswers: ["Andes", "Alps", "Rockies"],
    category: "geography",
    difficulty: "easy",
  },
  {
    question: "Which country has the most time zones?",
    correctAnswer: "France",
    wrongAnswers: ["Russia", "USA", "China"],
    category: "geography",
    difficulty: "hard",
  },

  // Entertainment
  {
    question: "Who directed the movie 'Inception'?",
    correctAnswer: "Christopher Nolan",
    wrongAnswers: ["Steven Spielberg", "James Cameron", "Ridley Scott"],
    category: "entertainment",
    difficulty: "medium",
  },
  {
    question: "What is the highest-grossing film of all time (unadjusted)?",
    correctAnswer: "Avatar",
    wrongAnswers: ["Avengers: Endgame", "Titanic", "Star Wars: The Force Awakens"],
    category: "entertainment",
    difficulty: "medium",
  },
  {
    question: "Which band performed 'Bohemian Rhapsody'?",
    correctAnswer: "Queen",
    wrongAnswers: ["The Beatles", "Led Zeppelin", "Pink Floyd"],
    category: "entertainment",
    difficulty: "easy",
  },
  {
    question: "In what year was the first iPhone released?",
    correctAnswer: "2007",
    wrongAnswers: ["2005", "2008", "2010"],
    category: "entertainment",
    difficulty: "medium",
  },
  {
    question: "What video game features a character named Master Chief?",
    correctAnswer: "Halo",
    wrongAnswers: ["Call of Duty", "Gears of War", "Destiny"],
    category: "entertainment",
    difficulty: "easy",
  },

  // Sports
  {
    question: "How many players are on a standard soccer team on the field?",
    correctAnswer: "11",
    wrongAnswers: ["9", "10", "12"],
    category: "sports",
    difficulty: "easy",
  },
  {
    question: "Which country has won the most FIFA World Cups?",
    correctAnswer: "Brazil",
    wrongAnswers: ["Germany", "Italy", "Argentina"],
    category: "sports",
    difficulty: "easy",
  },
  {
    question: "In basketball, how many points is a shot from beyond the arc worth?",
    correctAnswer: "3",
    wrongAnswers: ["2", "4", "1"],
    category: "sports",
    difficulty: "easy",
  },
  {
    question: "What is the term for three strikes in a row in bowling?",
    correctAnswer: "Turkey",
    wrongAnswers: ["Triple", "Hat trick", "Threepeat"],
    category: "sports",
    difficulty: "medium",
  },
  {
    question: "Which tennis tournament is played on grass?",
    correctAnswer: "Wimbledon",
    wrongAnswers: ["US Open", "French Open", "Australian Open"],
    category: "sports",
    difficulty: "medium",
  },
];

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureTriviaTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS trivia_stats (
      user_id TEXT PRIMARY KEY,
      correct INTEGER NOT NULL DEFAULT 0,
      incorrect INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

type TriviaStats = {
  correct: number;
  incorrect: number;
  points: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
};

function getStats(userId: string): TriviaStats {
  ensureTriviaTable();
  const db = getDb();

  type Row = {
    correct: number;
    incorrect: number;
    points: number;
    streak: number;
    best_streak: number;
  };

  const row = db
    .prepare(
      `SELECT correct, incorrect, points, streak, best_streak FROM trivia_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) {
    return { correct: 0, incorrect: 0, points: 0, streak: 0, bestStreak: 0, accuracy: 0 };
  }

  const total = row.correct + row.incorrect;
  const accuracy = total > 0 ? Math.round((row.correct / total) * 100) : 0;

  return {
    correct: row.correct,
    incorrect: row.incorrect,
    points: row.points,
    streak: row.streak,
    bestStreak: row.best_streak,
    accuracy,
  };
}

function recordCorrect(userId: string, points: number): void {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, incorrect, points, streak, best_streak, updated_at)
    VALUES (?, 1, 0, ?, 1, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      correct = correct + 1,
      points = points + ?,
      streak = streak + 1,
      best_streak = MAX(best_streak, streak + 1),
      updated_at = ?
  `,
  ).run(userId, points, now, points, now);
}

function recordIncorrect(userId: string): void {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, incorrect, points, streak, best_streak, updated_at)
    VALUES (?, 0, 1, 0, 0, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      incorrect = incorrect + 1,
      streak = 0,
      updated_at = ?
  `,
  ).run(userId, now, now);
}

function getTriviaLeaderboard(
  limit: number,
): Array<{ userId: string; points: number; correct: number; bestStreak: number }> {
  ensureTriviaTable();
  const db = getDb();

  type Row = {
    user_id: string;
    points: number;
    correct: number;
    best_streak: number;
  };

  const rows = db
    .prepare(
      `SELECT user_id, points, correct, best_streak FROM trivia_stats ORDER BY points DESC LIMIT ?`,
    )
    .all(limit) as Row[];

  return rows.map((r) => ({
    userId: r.user_id,
    points: r.points,
    correct: r.correct,
    bestStreak: r.best_streak,
  }));
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getRandomQuestion(category?: TriviaCategory): TriviaQuestion {
  const filtered = category
    ? QUESTIONS.filter((q) => q.category === category)
    : QUESTIONS;

  return filtered[Math.floor(Math.random() * filtered.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStats = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const categoryInput = interaction.options.getString(
    "category",
  ) as TriviaCategory | null;

  // Show stats
  if (showStats) {
    const stats = getStats(interaction.user.id);
    const lines = [
      `🧠 **Trivia Stats for ${interaction.user}**`,
      "",
      `📊 **Score:** ${stats.points} points`,
      `✅ Correct: ${stats.correct}`,
      `❌ Incorrect: ${stats.incorrect}`,
      `🎯 Accuracy: ${stats.accuracy}%`,
      `🔥 Current Streak: ${stats.streak}`,
      `⭐ Best Streak: ${stats.bestStreak}`,
    ];
    await interaction.editReply(lines.join("\n"));
    return;
  }

  // Show leaderboard
  if (showLeaderboard) {
    const leaders = getTriviaLeaderboard(10);

    if (leaders.length === 0) {
      await interaction.editReply(
        "🧠 **Trivia Leaderboard**\n\nNo trivia played yet! Be the first with `/fun trivia`",
      );
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = ["🧠 **Trivia Leaderboard**", ""];

    leaders.forEach((l, i) => {
      const prefix = medals[i] ?? `${i + 1}.`;
      lines.push(
        `${prefix} <@${l.userId}> — ${l.points} pts (${l.correct} correct, best streak: ${l.bestStreak})`,
      );
    });

    await interaction.editReply(lines.join("\n"));
    return;
  }

  // Play trivia
  const question = getRandomQuestion(categoryInput ?? undefined);
  const allAnswers = shuffleArray([question.correctAnswer, ...question.wrongAnswers]);
  const triviaId = `trivia-${Date.now()}-${interaction.user.id}`;

  const points = DIFFICULTY_POINTS[question.difficulty];
  const emoji = CATEGORY_EMOJI[question.category];

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    allAnswers.map((answer, i) =>
      new ButtonBuilder()
        .setCustomId(`${triviaId}:${i}`)
        .setLabel(answer)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  const message = await interaction.editReply({
    content: [
      `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
      "",
      `**${question.question}**`,
      "",
      `⏱️ You have 30 seconds! Worth **${points} points**`,
    ].join("\n"),
    components: [buttons],
  });

  const correctIndex = allAnswers.indexOf(question.correctAnswer);

  try {
    const response = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(triviaId),
      time: TRIVIA_TIMEOUT_MS,
    });

    const selectedIndex = parseInt(response.customId.split(":")[1], 10);
    const isCorrect = selectedIndex === correctIndex;

    // Disable all buttons and highlight correct/wrong
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId}:${i}`)
          .setLabel(answer)
          .setStyle(
            i === correctIndex
              ? ButtonStyle.Success
              : i === selectedIndex
                ? ButtonStyle.Danger
                : ButtonStyle.Secondary,
          )
          .setDisabled(true),
      ),
    );

    if (isCorrect) {
      recordCorrect(interaction.user.id, points);
      const stats = getStats(interaction.user.id);

      await response.update({
        content: [
          `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
          "",
          `**${question.question}**`,
          "",
          `✅ **Correct!** +${points} points`,
          `🔥 Streak: ${stats.streak} | Total: ${stats.points} pts`,
        ].join("\n"),
        components: [disabledButtons],
      });
    } else {
      recordIncorrect(interaction.user.id);

      await response.update({
        content: [
          `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
          "",
          `**${question.question}**`,
          "",
          `❌ **Wrong!** The answer was: **${question.correctAnswer}**`,
          `💔 Streak reset!`,
        ].join("\n"),
        components: [disabledButtons],
      });
    }
  } catch {
    // Timeout
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId}:${i}`)
          .setLabel(answer)
          .setStyle(i === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );

    recordIncorrect(interaction.user.id);

    await interaction.editReply({
      content: [
        `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
        "",
        `**${question.question}**`,
        "",
        `⏱️ **Time's up!** The answer was: **${question.correctAnswer}**`,
      ].join("\n"),
      components: [disabledButtons],
    });
  }
}
