// src/commands/fun/subcommands/rps/gameLogic.ts
//
// Rock-Paper-Scissors game logic.

export type Choice = "rock" | "paper" | "scissors";
export type Result = "win" | "lose" | "tie";

export const CHOICES: Choice[] = ["rock", "paper", "scissors"];

export const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export const CHOICE_LABELS: Record<Choice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

const WINS_AGAINST: Record<Choice, Choice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export function getBotChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

export function getResult(player: Choice, opponent: Choice): Result {
  if (player === opponent) return "tie";
  if (WINS_AGAINST[player] === opponent) return "win";
  return "lose";
}

export function getResultEmoji(result: Result): string {
  switch (result) {
    case "win":
      return "🎉";
    case "lose":
      return "😢";
    case "tie":
      return "🤝";
  }
}

export function getResultText(result: Result): string {
  switch (result) {
    case "win":
      return "You win!";
    case "lose":
      return "You lose!";
    case "tie":
      return "It's a tie!";
  }
}
