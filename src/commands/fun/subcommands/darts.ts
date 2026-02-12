// src/commands/fun/subcommands/darts.ts
//
// Throw 3 darts at the board! Solo, PvP challenge, stats, leaderboards.

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { safeReplyToButton } from "../../../services/discord/safeReply.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../services/discord/interactionErrors.js";
import {
  checkDartsCooldown,
  recordDartsThrow,
} from "../../../services/discord/rateLimit.js";
import {
  getStats,
  getBestRoundLeaderboard,
  get180Leaderboard,
  getPvpWinsLeaderboard,
  recordSoloThrow,
  recordPvpResult,
  getPvpStats,
  getH2HStats,
} from "./dartsStore.js";
import { DARTBOARD_ART, doThrow, formatThrowLines } from "./darts/gameLogic.js";
import { buildThrowButton, buildDeclineButton, buildExtendButton } from "./darts/ui.js";

import { GAME_TIMEOUT_MS } from "../../../constants.js";

const CHALLENGE_TIMEOUT_MS = GAME_TIMEOUT_MS;

/* -------------------------------------------------------------------------- */
/* Stats & Leaderboard                                                         */
/* -------------------------------------------------------------------------- */

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const solo = getStats(user.id);
  const pvp = getPvpStats(user.id);

  const lines: string[] = [
    `🎯 **Darts Stats for ${user}**`,
    "",
    "**Solo**",
    `Throws: ${solo.throws} | Best round: ${solo.bestRound} | 180s: ${solo.count180}`,
    "",
    "**PvP**",
    `Games: ${pvp.total} | Wins: ${pvp.wins} | Losses: ${pvp.losses} | Ties: ${pvp.ties}`,
    `Win rate: ${pvp.winRate}%`,
  ];

  await interaction.editReply(lines.join("\n"));
}

async function showLeaderboard(
  interaction: ChatInputCommandInteraction,
  view: "best" | "180" | "pvp",
): Promise<void> {
  if (view === "best") {
    const leaders = getBestRoundLeaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No best rounds recorded yet! Throw some darts!");
      return;
    }
    const lines = leaders.map(
      (l, i) => `${i + 1}. <@${l.user_id}> – **${l.best_round}**`,
    );
    await interaction.editReply(
      ["🎯 **Best Round Leaderboard**", "", ...lines].join("\n"),
    );
  } else if (view === "180") {
    const leaders = get180Leaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No 180s hit yet! Keep throwing!");
      return;
    }
    const lines = leaders.map(
      (l, i) =>
        `${i + 1}. <@${l.user_id}> – **${l.count_180}** 180${l.count_180 === 1 ? "" : "s"}`,
    );
    await interaction.editReply(["🎯 **180 Leaderboard**", "", ...lines].join("\n"));
  } else {
    const leaders = getPvpWinsLeaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No PvP wins yet! Challenge someone!");
      return;
    }
    const lines = leaders.map(
      (l, i) => `${i + 1}. <@${l.user_id}> – **${l.wins}** win${l.wins === 1 ? "" : "s"}`,
    );
    await interaction.editReply(
      ["🎯 **Darts PvP Wins Leaderboard**", "", ...lines].join("\n"),
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Solo throw                                                                  */
/* -------------------------------------------------------------------------- */

async function runSoloThrow(interaction: ChatInputCommandInteraction): Promise<void> {
  const remaining = checkDartsCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      `⏱️ Slow down! Try again in **${Math.ceil(remaining / 1000)}** seconds (rate limit: 2s).`,
    );
    return;
  }

  const { hits, score, is180 } = doThrow();
  recordDartsThrow(interaction.user.id);
  recordSoloThrow(interaction.user.id, score, is180);

  const lines = ["🎯 **Darts**", "", DARTBOARD_ART, "", ...formatThrowLines(hits, score)];

  await interaction.editReply(lines.join("\n"));

  logger.info(
    { userId: interaction.user.id, hits: hits.map((h) => h.value), score },
    "[darts] solo throw complete",
  );
}

/* -------------------------------------------------------------------------- */
/* PvP challenge                                                               */
/* -------------------------------------------------------------------------- */

async function handleChallenge(
  interaction: ChatInputCommandInteraction,
  opponent: User,
): Promise<void> {
  const challenger = interaction.user;

  if (opponent.id === challenger.id) {
    await interaction.editReply(
      "You can't challenge yourself! Try `/fun darts` to throw solo.",
    );
    return;
  }

  if (opponent.bot) {
    await interaction.editReply(
      "You can't challenge a bot! Try `/fun darts` to throw solo.",
    );
    return;
  }

  const remaining = checkDartsCooldown(challenger.id);
  if (remaining > 0) {
    await interaction.editReply(
      `⏱️ Slow down! Try again in **${Math.ceil(remaining / 1000)}** seconds (rate limit: 2s).`,
    );
    return;
  }

  const challengeId = `${Date.now()}-${challenger.id}`;

  const { hits, score, is180 } = doThrow();
  recordDartsThrow(challenger.id);
  recordSoloThrow(challenger.id, score, is180);

  const h2h = getH2HStats(challenger.id, opponent.id);
  const h2hText =
    h2h.total > 0
      ? `\n📊 Head-to-head: ${challenger.username} ${h2h.user1Wins}–${h2h.user2Wins} ${opponent.username} (${h2h.ties} ties)`
      : "";

  const challengerLines = formatThrowLines(hits, score, `${challenger.username}'s throw`);

  const challengeMessage = await interaction.editReply({
    content: [
      `🎯 **Darts Challenge!**`,
      ``,
      `${challenger} challenges ${opponent}!`,
      h2hText,
      ``,
      DARTBOARD_ART,
      ``,
      ...challengerLines,
      ``,
      `${opponent} – click **Throw my darts** to take your turn!`,
      `⏱️ You have 1 hour (starter can extend)`,
    ].join("\n"),
    components: [
      buildThrowButton(challengeId),
      buildDeclineButton(challengeId),
      buildExtendButton(challengeId),
    ],
  });

  const challengerScore = score;
  const challengerHits = hits;
  const allowedOpponent = opponent.id;

  const collector = challengeMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CHALLENGE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(`darts:${challengeId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const playerId = buttonInteraction.user.id;
    const action = buttonInteraction.customId.split(":")[2] as
      | "throw"
      | "decline"
      | "extend";

    if (action === "extend") {
      if (playerId !== challenger.id) {
        await safeReplyToButton(
          buttonInteraction,
          "Only the person who started the challenge can extend time.",
        );
        return;
      }
      collector.resetTimer();
      await buttonInteraction.deferUpdate();
      const content = [
        `🎯 **Darts Challenge!**`,
        ``,
        `${challenger} challenges ${opponent}!`,
        h2hText,
        ``,
        DARTBOARD_ART,
        ``,
        ...formatThrowLines(
          challengerHits,
          challengerScore,
          `${challenger.username}'s throw`,
        ),
        ``,
        `${opponent} – click **Throw my darts** to take your turn!`,
        `⏱️ **Time extended!** You have another hour.`,
      ].join("\n");
      await challengeMessage.edit({
        content,
        components: [
          buildThrowButton(challengeId),
          buildDeclineButton(challengeId),
          buildExtendButton(challengeId),
        ],
      });
      return;
    }

    if (action === "decline") {
      if (playerId === opponent.id) {
        collector.stop("declined");
        await buttonInteraction.update({
          content: `❌ ${opponent} declined the darts challenge.`,
          components: [],
        });
        return;
      } else {
        collector.stop("cancelled");
        await buttonInteraction.update({
          content: `❌ ${challenger} cancelled the challenge.`,
          components: [],
        });
        return;
      }
    }

    if (action === "throw" && playerId === allowedOpponent) {
      const remainingOpp = checkDartsCooldown(opponent.id);
      if (remainingOpp > 0) {
        await safeReplyToButton(
          buttonInteraction,
          `⏱️ Slow down! Try again in **${Math.ceil(remainingOpp / 1000)}** seconds.`,
        );
        return;
      }

      const { hits: oppHits, score: oppScore, is180: opp180 } = doThrow();
      recordDartsThrow(opponent.id);
      recordSoloThrow(opponent.id, oppScore, opp180);

      let winnerId: string | null = null;
      let loserId: string | null = null;
      let resultText: string;

      if (oppScore > challengerScore) {
        winnerId = opponent.id;
        loserId = challenger.id;
        resultText = `🎉 **${opponent.username} wins!** ${oppScore}–${challengerScore}`;
      } else if (oppScore < challengerScore) {
        winnerId = challenger.id;
        loserId = opponent.id;
        resultText = `🎉 **${challenger.username} wins!** ${challengerScore}–${oppScore}`;
      } else {
        resultText = `🤝 **It's a tie!** ${challengerScore}–${oppScore}`;
      }

      recordPvpResult(winnerId, loserId, challenger.id, opponent.id);
      logger.info(
        { challengeId, challengerScore, oppScore, winnerId },
        "[darts] PvP complete",
      );

      const oppLines = formatThrowLines(
        oppHits,
        oppScore,
        `${opponent.username}'s throw`,
      );

      try {
        await buttonInteraction.update({
          content: [
            `🎯 **Darts Result!**`,
            ``,
            `${challenger} **${challengerScore}** vs **${oppScore}** ${opponent}`,
            ``,
            ...formatThrowLines(
              challengerHits,
              challengerScore,
              `${challenger.username}`,
            ),
            ``,
            ...oppLines,
            ``,
            resultText,
          ].join("\n"),
          components: [buildThrowButton(challengeId, true)],
        });
      } catch (err) {
        if (isKnownInteractionError(err)) {
          logKnownInteractionError(err, "darts.challengeResult", { challengeId });
        } else {
          throw err;
        }
      }
      collector.stop("complete");
    } else if (action === "throw") {
      await safeReplyToButton(
        buttonInteraction,
        "Only the challenged player can throw here!",
      );
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "complete" || reason === "declined" || reason === "cancelled") {
      return;
    }

    let timeoutText: string;
    try {
      timeoutText = `${opponent} didn't throw in time.`;
      await challengeMessage.edit({
        content: `⏱️ **Challenge timed out!**\n\n${timeoutText}`,
        components: [buildThrowButton(challengeId, true)],
      });
      logger.warn({ challengeId }, "[darts] challenge timed out");
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "darts.challengeTimeout", { challengeId });
      } else {
        throw err;
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const opponent = interaction.options.getUser("opponent");
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const leaderboardView = interaction.options.getString("leaderboard");

  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (
    leaderboardView === "best" ||
    leaderboardView === "180" ||
    leaderboardView === "pvp"
  ) {
    await showLeaderboard(interaction, leaderboardView);
    return;
  }

  if (opponent) {
    await handleChallenge(interaction, opponent);
    return;
  }

  await runSoloThrow(interaction);
}
