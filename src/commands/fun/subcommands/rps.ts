// src/commands/fun/subcommands/rps.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

type Choice = "rock" | "paper" | "scissors";
type Result = "win" | "lose" | "tie";

const CHOICES: Choice[] = ["rock", "paper", "scissors"];

const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const CHOICE_LABELS: Record<Choice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

const WINS_AGAINST: Record<Choice, Choice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

const CHALLENGE_TIMEOUT_MS = 60_000; // 60 seconds

function getBotChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getResult(player: Choice, opponent: Choice): Result {
  if (player === opponent) return "tie";
  if (WINS_AGAINST[player] === opponent) return "win";
  return "lose";
}

function getResultEmoji(result: Result): string {
  switch (result) {
    case "win":
      return "🎉";
    case "lose":
      return "😢";
    case "tie":
      return "🤝";
  }
}

function getResultText(result: Result): string {
  switch (result) {
    case "win":
      return "You win!";
    case "lose":
      return "You lose!";
    case "tie":
      return "It's a tie!";
  }
}

/* -------------------------------------------------------------------------- */
/* Database setup                                                              */
/* -------------------------------------------------------------------------- */

function ensureTables(): void {
  const db = getDb();

  db.exec(`
    -- Solo stats (vs bot)
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    -- PvP head-to-head records
    CREATE TABLE IF NOT EXISTS rps_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );

    -- PvP overall stats
    CREATE TABLE IF NOT EXISTS rps_pvp_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Solo stats (vs bot)                                                         */
/* -------------------------------------------------------------------------- */

function recordSoloResult(userId: string, result: Result): void {
  ensureTables();
  const db = getDb();
  const now = Date.now();

  const column = result === "win" ? "wins" : result === "lose" ? "losses" : "ties";

  db.prepare(
    `
    INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ${column} = ${column} + 1,
      updated_at = ?
  `,
  ).run(
    userId,
    result === "win" ? 1 : 0,
    result === "lose" ? 1 : 0,
    result === "tie" ? 1 : 0,
    now,
    now,
  );
}

type RpsStats = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
};

function getSoloStats(userId: string): RpsStats {
  ensureTables();
  const db = getDb();

  type StatsRow = { wins: number; losses: number; ties: number };

  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`)
    .get(userId) as StatsRow | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { wins: row.wins, losses: row.losses, ties: row.ties, total, winRate };
}

/* -------------------------------------------------------------------------- */
/* PvP stats                                                                   */
/* -------------------------------------------------------------------------- */

function recordPvpResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  ensureTables();
  const db = getDb();
  const now = Date.now();

  // Update PvP overall stats
  if (winnerId && loserId) {
    // Winner
    db.prepare(
      `
      INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
      VALUES (?, 1, 0, 0, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        wins = wins + 1,
        updated_at = ?
    `,
    ).run(winnerId, now, now);

    // Loser
    db.prepare(
      `
      INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
      VALUES (?, 0, 1, 0, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        losses = losses + 1,
        updated_at = ?
    `,
    ).run(loserId, now, now);
  } else {
    // Tie - update both
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `
        INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
        VALUES (?, 0, 0, 1, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          ties = ties + 1,
          updated_at = ?
      `,
      ).run(id, now, now);
    }
  }

  // Update head-to-head record (always store with lower ID first for consistency)
  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `
    INSERT INTO rps_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user1_id, user2_id) DO UPDATE SET
      user1_wins = user1_wins + ?,
      user2_wins = user2_wins + ?,
      ties = ties + ?,
      updated_at = ?
  `,
  ).run(
    id1,
    id2,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
  );
}

function getPvpStats(userId: string): RpsStats {
  ensureTables();
  const db = getDb();

  type StatsRow = { wins: number; losses: number; ties: number };

  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_pvp_stats WHERE user_id = ?`)
    .get(userId) as StatsRow | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { wins: row.wins, losses: row.losses, ties: row.ties, total, winRate };
}

type H2HStats = {
  user1Wins: number;
  user2Wins: number;
  ties: number;
  total: number;
};

function getH2HStats(userId1: string, userId2: string): H2HStats {
  ensureTables();
  const db = getDb();

  const [id1, id2] = [userId1, userId2].sort();

  type H2HRow = { user1_wins: number; user2_wins: number; ties: number };

  const row = db
    .prepare(
      `SELECT user1_wins, user2_wins, ties FROM rps_h2h WHERE user1_id = ? AND user2_id = ?`,
    )
    .get(id1, id2) as H2HRow | undefined;

  if (!row) {
    return { user1Wins: 0, user2Wins: 0, ties: 0, total: 0 };
  }

  // Swap wins if the original order was different
  const user1Wins = userId1 === id1 ? row.user1_wins : row.user2_wins;
  const user2Wins = userId1 === id1 ? row.user2_wins : row.user1_wins;

  return {
    user1Wins,
    user2Wins,
    ties: row.ties,
    total: row.user1_wins + row.user2_wins + row.ties,
  };
}

/* -------------------------------------------------------------------------- */
/* Button builders                                                             */
/* -------------------------------------------------------------------------- */

function buildChoiceButtons(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:rock`)
      .setLabel("Rock")
      .setEmoji("🪨")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:paper`)
      .setLabel("Paper")
      .setEmoji("📄")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:scissors`)
      .setLabel("Scissors")
      .setEmoji("✂️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

function buildDeclineButton(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:decline`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

/* -------------------------------------------------------------------------- */
/* Challenge handler                                                           */
/* -------------------------------------------------------------------------- */

async function handleChallenge(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  // Can't challenge yourself
  if (opponent.id === challenger.id) {
    await interaction.editReply(
      "You can't challenge yourself! Try `/fun rps` to play against the bot.",
    );
    return;
  }

  // Can't challenge bots
  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Try `/fun rps` to play against me instead.",
    );
    return;
  }

  const challengeId = `${Date.now()}-${challenger.id}`;

  // Get head-to-head history
  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Head-to-head: ${challenger.username} ${h2h.user1Wins} - ${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const challengeMessage = await interaction.editReply({
    content: [
      `⚔️ **Rock Paper Scissors Challenge!**`,
      ``,
      `${challenger} challenges ${opponent} to a duel!`,
      `${h2hText}`,
      ``,
      `Both players: click your choice below.`,
      `⏱️ You have 60 seconds!`,
    ].join("\n"),
    components: [buildChoiceButtons(challengeId), buildDeclineButton(challengeId)],
  });

  // Track choices
  const choices: Map<string, Choice> = new Map();
  const allowedPlayers = new Set([challenger.id, opponent.id]);

  const collector = challengeMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CHALLENGE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`rps:${challengeId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const playerId = buttonInteraction.user.id;

    // Only challenger and opponent can interact
    if (!allowedPlayers.has(playerId)) {
      await buttonInteraction.reply({
        content: "This challenge isn't for you!",
        ephemeral: true,
      });
      return;
    }

    const action = buttonInteraction.customId.split(":")[2] as Choice | "decline";

    // Handle decline
    if (action === "decline") {
      if (playerId === opponent.id) {
        collector.stop("declined");
        await buttonInteraction.update({
          content: `❌ ${opponent} declined the challenge.`,
          components: [],
        });
        return;
      } else {
        // Challenger can also cancel
        collector.stop("cancelled");
        await buttonInteraction.update({
          content: `❌ ${challenger} cancelled the challenge.`,
          components: [],
        });
        return;
      }
    }

    // Record choice
    if (CHOICES.includes(action)) {
      choices.set(playerId, action);

      await buttonInteraction.reply({
        content: `You chose ${EMOJI[action]} **${CHOICE_LABELS[action]}**! Waiting for your opponent...`,
        ephemeral: true,
      });

      // Check if both players have chosen
      if (choices.has(challenger.id) && choices.has(opponent.id)) {
        collector.stop("complete");
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "declined" || reason === "cancelled") {
      return; // Already handled
    }

    if (reason === "complete") {
      // Both players made choices
      const challengerChoice = choices.get(challenger.id)!;
      const opponentChoice = choices.get(opponent.id)!;
      const result = getResult(challengerChoice, opponentChoice);

      let winnerId: string | null = null;
      let loserId: string | null = null;
      let resultText: string;

      if (result === "win") {
        winnerId = challenger.id;
        loserId = opponent.id;
        resultText = `🎉 **${challenger.username} wins!**`;
      } else if (result === "lose") {
        winnerId = opponent.id;
        loserId = challenger.id;
        resultText = `🎉 **${opponent.username} wins!**`;
      } else {
        resultText = `🤝 **It's a tie!**`;
      }

      // Record the result
      try {
        recordPvpResult(winnerId, loserId, challenger.id, opponent.id);
      } catch (err) {
        logger.error({ err }, "[fun/rps] failed to record PvP result");
      }

      // Update the message with results
      await challengeMessage.edit({
        content: [
          `⚔️ **Rock Paper Scissors Result!**`,
          ``,
          `${EMOJI[challengerChoice]} ${challenger} vs ${opponent} ${EMOJI[opponentChoice]}`,
          ``,
          resultText,
        ].join("\n"),
        components: [buildChoiceButtons(challengeId, true)],
      });
    } else {
      // Timeout
      const challengerChose = choices.has(challenger.id);
      const opponentChose = choices.has(opponent.id);

      let timeoutText: string;
      if (!challengerChose && !opponentChose) {
        timeoutText = "Neither player made a choice in time.";
      } else if (!challengerChose) {
        timeoutText = `${challenger} didn't make a choice in time.`;
      } else {
        timeoutText = `${opponent} didn't make a choice in time.`;
      }

      await challengeMessage.edit({
        content: `⏱️ **Challenge timed out!**\n\n${timeoutText}`,
        components: [buildChoiceButtons(challengeId, true)],
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Stats display                                                               */
/* -------------------------------------------------------------------------- */

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const soloStats = getSoloStats(user.id);
  const pvpStats = getPvpStats(user.id);

  const lines: string[] = [];
  lines.push(`✊✋✌️ **RPS Stats for ${user}**`);
  lines.push("");
  lines.push("**vs Bot:**");
  lines.push(
    `Games: ${soloStats.total} | Wins: ${soloStats.wins} | Losses: ${soloStats.losses} | Ties: ${soloStats.ties}`,
  );
  lines.push(`Win Rate: ${soloStats.winRate}%`);
  lines.push("");
  lines.push("**vs Players:**");
  lines.push(
    `Games: ${pvpStats.total} | Wins: ${pvpStats.wins} | Losses: ${pvpStats.losses} | Ties: ${pvpStats.ties}`,
  );
  lines.push(`Win Rate: ${pvpStats.winRate}%`);

  await interaction.editReply(lines.join("\n"));
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("opponent");

  // Handle stats request
  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  // Handle PvP challenge
  if (opponent) {
    await handleChallenge(interaction, opponent);
    return;
  }

  // Solo play vs bot
  const choiceInput = interaction.options.getString("choice");

  if (!choiceInput) {
    await interaction.editReply(
      "Pick rock, paper, or scissors to play against the bot, or use `opponent:@user` to challenge someone!",
    );
    return;
  }

  const choice = choiceInput.toLowerCase();

  if (!CHOICES.includes(choice as Choice)) {
    await interaction.editReply("Invalid choice! Pick `rock`, `paper`, or `scissors`.");
    return;
  }

  const playerChoice = choice as Choice;

  try {
    const botChoice = getBotChoice();
    const result = getResult(playerChoice, botChoice);

    recordSoloResult(interaction.user.id, result);

    const lines: string[] = [];
    lines.push(`${EMOJI[playerChoice]} **You** vs **Bot** ${EMOJI[botChoice]}`);
    lines.push("");
    lines.push(`${getResultEmoji(result)} **${getResultText(result)}**`);

    await interaction.editReply(lines.join("\n"));
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[fun/rps] failed");
    await interaction.editReply("Something went wrong. Try again!");
  }
}
