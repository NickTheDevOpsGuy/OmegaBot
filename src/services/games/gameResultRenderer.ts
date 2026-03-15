// src/services/games/gameResultRenderer.ts
//
// Reusable system for rendering game result embeds.
// Game commands use this for consistent title, win/loss, board, rewards, XP, streaks, milestones, leaderboard, footer.

import { EmbedBuilder, type APIEmbed } from "discord.js";

export type GameOutcome = "win" | "loss" | "draw";

export type GameResultInput = {
  /** Game display name (e.g. "Slot Machine", "Blackjack") */
  gameTitle: string;
  /** win | loss | draw */
  outcome: GameOutcome;
  /** Optional subtitle (e.g. "5 paylines") */
  subtitle?: string;
  /** Main visual: board/grid lines or description (array of lines joined by \n) */
  boardLines?: string[];
  /** Short win/loss/draw message (e.g. "Two Grapes — 2× payout") */
  outcomeMessage?: string;
  /** Reward summary lines (e.g. "+12 XP", "🔥 Win Streak: 3") */
  rewardLines?: string[];
  /** XP gained this game (optional; can be included in rewardLines instead) */
  xpGained?: number;
  /** Level-up message if applicable */
  levelUpMessage?: string;
  /** Streak info (e.g. "Win Streak: 3") */
  streakText?: string;
  /** Leaderboard teaser (e.g. "Rank #4 this week") */
  leaderboardSummary?: string;
  /** Achievement unlock line */
  achievementUnlocked?: string;
  /** Milestone line (e.g. "🎉 Milestone: 5 slots wins!") */
  milestoneLine?: string;
  /** Footer hint lines (e.g. "Try: /fun slots stats • /fun leaderboard") */
  footerHints?: string[];
  /** Embed color (hex number). Defaults by outcome: win=green, loss=gray, draw=blue */
  color?: number;
};

const DEFAULT_COLORS: Record<GameOutcome, number> = {
  win: 0x22c55e,
  loss: 0x64748b,
  draw: 0x5865f2,
};

/** Build a single embed from a structured game result. */
export function buildGameResultEmbed(input: GameResultInput): EmbedBuilder {
  const color = input.color ?? DEFAULT_COLORS[input.outcome];
  const title = input.subtitle
    ? `${input.gameTitle} — ${input.subtitle}`
    : input.gameTitle;

  const embed = new EmbedBuilder().setTitle(title).setColor(color);

  const descriptionParts: string[] = [];

  if (input.boardLines && input.boardLines.length > 0) {
    descriptionParts.push(input.boardLines.join("\n"));
  }

  // Outcome section
  if (input.outcomeMessage) {
    const outcomeLabel =
      input.outcome === "win" ? "✨ Winner!" : input.outcome === "loss" ? "—" : "🤝 Draw";
    descriptionParts.push("", `**${outcomeLabel}**`, input.outcomeMessage);
  }

  const fullDescription = descriptionParts.filter(Boolean).join("\n");
  if (fullDescription) embed.setDescription(fullDescription);

  // Rewards as a field for prominence
  const rewardParts: string[] = [];
  if (input.xpGained != null && input.xpGained > 0) {
    rewardParts.push(`+${input.xpGained} XP`);
    if (input.levelUpMessage) rewardParts.push(input.levelUpMessage);
  }
  if (input.streakText) rewardParts.push(`🔥 ${input.streakText}`);
  if (input.leaderboardSummary) rewardParts.push(`🏆 ${input.leaderboardSummary}`);
  if (input.rewardLines?.length) rewardParts.push(...input.rewardLines);

  if (rewardParts.length > 0) {
    embed.addFields({
      name: "Rewards",
      value: rewardParts.join("\n"),
      inline: false,
    });
  }

  // Milestone / achievement as separate field if present
  const extraLines: string[] = [];
  if (input.milestoneLine) extraLines.push(input.milestoneLine);
  if (input.achievementUnlocked) extraLines.push(input.achievementUnlocked);
  if (extraLines.length > 0) {
    embed.addFields({
      name: "Achievements",
      value: extraLines.join("\n"),
      inline: false,
    });
  }

  const footerParts = input.footerHints?.length
    ? input.footerHints
    : ["Play again • /fun slots stats • /fun utility leaderboard"];
  embed.setFooter({ text: footerParts.join(" • ") });

  return embed;
}

/** Return payload suitable for interaction.editReply({ embeds: [embed] }). */
export function buildGameResultReplyPayload(input: GameResultInput): {
  embeds: [APIEmbed];
} {
  const embed = buildGameResultEmbed(input);
  return { embeds: [embed.toJSON()] as [APIEmbed] };
}
