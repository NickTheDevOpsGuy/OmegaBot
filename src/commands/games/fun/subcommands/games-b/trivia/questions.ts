// src/commands/fun/subcommands/trivia/questions.ts
//
// Trivia question data and selection logic.

export type TriviaCategory =
  | "general"
  | "science"
  | "history"
  | "geography"
  | "entertainment"
  | "sports";

export type Difficulty = "easy" | "medium" | "hard";

export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  category: TriviaCategory;
  difficulty: Difficulty;
}

export const CATEGORY_EMOJI: Record<TriviaCategory, string> = {
  general: "🎯",
  science: "🔬",
  history: "📜",
  geography: "🌍",
  entertainment: "🎬",
  sports: "⚽",
};

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

export const QUESTIONS: TriviaQuestion[] = [
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

export function getRandomQuestion(category?: TriviaCategory): TriviaQuestion {
  const filtered = category
    ? QUESTIONS.filter((q) => q.category === category)
    : QUESTIONS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
