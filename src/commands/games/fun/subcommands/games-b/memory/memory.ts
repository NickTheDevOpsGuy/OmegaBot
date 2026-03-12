// src/commands/games/fun/subcommands/games-b/memory/memory.ts
// Memory match game: 8 cards (4 pairs), flip two at a time to find matches.

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
import {
  MEMORY_FLIP_BACK_MS,
  GAME_TIMEOUT_MS,
} from "../../../../../../utils/constants.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";

const EMOJIS = ["🍎", "🍊", "🍋", "🍇"];
const PAIRS = 4;
const TOTAL = PAIRS * 2;

type MemoryState = {
  slots: number[];
  revealed: number[];
  matched: number[];
  firstPick: number | null;
  userId: string;
  moves: number;
};

const games = new Map<string, MemoryState>();

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildSlots(): number[] {
  const pairs = [...Array(PAIRS)].map((_, i) => i);
  return shuffle([...pairs, ...pairs]);
}

function buildComponents(
  gameId: string,
  state: MemoryState,
): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>();
  const row2 = new ActionRowBuilder<ButtonBuilder>();
  for (let i = 0; i < TOTAL; i++) {
    const isRevealed = state.revealed.includes(i) || state.matched.includes(i);
    const label = isRevealed ? EMOJIS[state.slots[i]]! : "?";
    const disabled = state.matched.includes(i);
    const btn = new ButtonBuilder()
      .setCustomId(`mem:${gameId}:${i}`)
      .setLabel(label)
      .setStyle(disabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(disabled);
    if (i < 4) row1.addComponents(btn);
    else row2.addComponents(btn);
  }
  return [row1, row2];
}

function buildEmbed(state: MemoryState, done: boolean): EmbedBuilder {
  const title = done ? "🎴 Memory — You won!" : "🎴 Memory — Find the pairs";
  const pairsLeft = PAIRS - state.matched.length / 2;
  const desc = done
    ? `You matched all pairs in **${state.moves}** moves!`
    : `Pairs left: **${pairsLeft}** | Moves: **${state.moves}**`;
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x5865f2);
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameId = randomUUID();
  const userId = interaction.user.id;
  const state: MemoryState = {
    slots: buildSlots(),
    revealed: [],
    matched: [],
    firstPick: null,
    userId,
    moves: 0,
  };
  games.set(gameId, state);

  const embed = buildEmbed(state, false);
  const components = buildComponents(gameId, state);

  await interaction.editReply({
    embeds: [embed],
    components,
  });

  const message = (await interaction.fetchReply().catch(() => null)) as Message | null;
  if (!message) return;

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: GAME_TIMEOUT_MS,
    filter: (i) => i.user.id === userId && i.customId.startsWith(`mem:${gameId}:`),
  });

  collector.on("collect", async (btn: ButtonInteraction) => {
    const current = games.get(gameId);
    if (!current || current.matched.length === TOTAL) return;

    const idx = parseInt(btn.customId.split(":")[2]!, 10);
    if (current.revealed.includes(idx) || current.matched.includes(idx)) {
      await btn.deferUpdate().catch(() => {});
      return;
    }

    await btn.deferUpdate().catch(() => {});

    if (current.firstPick === null) {
      current.firstPick = idx;
      current.revealed = [idx];
      current.moves += 1;
      const ok1 = await safeMessageEdit(
        message,
        {
          embeds: [buildEmbed(current, false)],
          components: buildComponents(gameId, current),
        },
        "memory.reveal1",
        interaction,
      ).catch(() => false);
      if (!ok1) {
        collector.stop("message_gone");
        await notifyGameMessageGone(btn, "memory");
      }
      return;
    }

    const firstIdx = current.firstPick;
    current.revealed = [firstIdx, idx];
    current.moves += 1;
    current.firstPick = null;

    const match = current.slots[firstIdx] === current.slots[idx];
    if (match) {
      current.matched.push(firstIdx, idx);
      current.revealed = [];
      const done = current.matched.length === TOTAL;
      const okMatch = await safeMessageEdit(
        message,
        {
          embeds: [buildEmbed(current, done)],
          components: buildComponents(gameId, current),
        },
        "memory.match",
        interaction,
      ).catch(() => false);
      if (!okMatch) {
        if (done) collector.stop("message_gone");
        await notifyGameMessageGone(btn, "memory");
      }

      if (done) {
        games.delete(gameId);
        collector.stop("complete");
      }
      return;
    }

    const ok2 = await safeMessageEdit(
      message,
      {
        embeds: [buildEmbed(current, false)],
        components: buildComponents(gameId, current),
      },
      "memory.reveal2",
      interaction,
    ).catch(() => false);
    if (!ok2) {
      collector.stop("message_gone");
      await notifyGameMessageGone(btn, "memory");
    }

    setTimeout(() => {
      const s = games.get(gameId);
      if (!s) return;
      if (
        s.revealed.length !== 2 ||
        !s.revealed.includes(firstIdx) ||
        !s.revealed.includes(idx)
      )
        return;
      s.revealed = [];
      safeMessageEdit(
        message,
        {
          embeds: [buildEmbed(s, false)],
          components: buildComponents(gameId, s),
        },
        "memory.flipback",
        interaction,
      ).catch(() => {});
    }, MEMORY_FLIP_BACK_MS);
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") games.delete(gameId);
  });
}
