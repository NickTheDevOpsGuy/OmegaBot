// src/commands/games/fun/subcommands/games-b/higherlower/higherlower.ts
// Higher/Lower: bot guesses your number 1–100; you say Higher, Lower, or Correct.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Message,
  type ButtonInteraction,
} from "discord.js";
import { randomUUID } from "node:crypto";
import { SHORT_TIMEOUT_MS } from "../../../../../../utils/constants.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";

type HLState = { low: number; high: number; guesses: number; userId: string };
const games = new Map<string, HLState>();

function mid(state: HLState): number {
  return Math.floor((state.low + state.high) / 2);
}

function buildEmbed(
  state: HLState,
  guess: number,
  done: boolean,
  message?: string,
): EmbedBuilder {
  const title = done ? "🎯 Higher/Lower — Got it!" : "🎯 Higher/Lower";
  const desc = done
    ? (message ??
      `I got it in **${state.guesses}** guess${state.guesses === 1 ? "" : "es"}!${state.guesses === 1 ? " 🎉" : ""}`)
    : `Think of a number **1–100**. Is it **${guess}**?`;
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(0x5865f2)
    .setFooter({ text: `Range: ${state.low}–${state.high} | Guesses: ${state.guesses}` });
}

function buildRow(gameId: string, done: boolean): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`hl:${gameId}:higher`)
      .setLabel("Higher")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📈")
      .setDisabled(done),
    new ButtonBuilder()
      .setCustomId(`hl:${gameId}:lower`)
      .setLabel("Lower")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📉")
      .setDisabled(done),
    new ButtonBuilder()
      .setCustomId(`hl:${gameId}:correct`)
      .setLabel("Correct!")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅")
      .setDisabled(done),
  );
  return row;
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameId = randomUUID();
  const userId = interaction.user.id;
  const state: HLState = { low: 1, high: 100, guesses: 0, userId };
  games.set(gameId, state);

  const guess = mid(state);
  state.guesses += 1;

  await interaction.editReply({
    embeds: [buildEmbed(state, guess, false)],
    components: [buildRow(gameId, false)],
  });

  const message = (await interaction.fetchReply().catch(() => null)) as Message | null;
  if (!message) return;

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: SHORT_TIMEOUT_MS,
    filter: (i) => i.user.id === userId && i.customId.startsWith(`hl:${gameId}:`),
  });

  collector.on("collect", async (btn: ButtonInteraction) => {
    const current = games.get(gameId);
    if (!current) return;

    const action = btn.customId.split(":")[2];
    await btn.deferUpdate().catch(() => {});

    const g = mid(current);

    if (action === "correct") {
      games.delete(gameId);
      collector.stop("complete");
      const okCorrect = await safeMessageEdit(
        message,
        {
          embeds: [buildEmbed(current, g, true)],
          components: [buildRow(gameId, true)],
        },
        "higherlower.correct",
        interaction,
      ).catch(() => false);
      if (!okCorrect) await notifyGameMessageGone(btn, "higherlower");
      return;
    }

    if (action === "higher") {
      current.low = g + 1;
    } else {
      current.high = g - 1;
    }

    if (current.low > current.high) {
      games.delete(gameId);
      collector.stop("impossible");
      const okImpossible = await safeMessageEdit(
        message,
        {
          embeds: [
            buildEmbed(
              current,
              g,
              true,
              "That’s impossible with the answers you gave! Starting a new game would fix it.",
            ),
          ],
          components: [buildRow(gameId, true)],
        },
        "higherlower.impossible",
        interaction,
      ).catch(() => false);
      if (!okImpossible) await notifyGameMessageGone(btn, "higherlower");
      return;
    }

    const nextGuess = mid(current);
    current.guesses += 1;

    const okNext = await safeMessageEdit(
      message,
      {
        embeds: [buildEmbed(current, nextGuess, false)],
        components: [buildRow(gameId, false)],
      },
      "higherlower.next",
      interaction,
    ).catch(() => false);
    if (!okNext) {
      collector.stop("message_gone");
      await notifyGameMessageGone(btn, "higherlower");
    }
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") games.delete(gameId);
  });
}
