// src/commands/fun/subcommands/blackjack.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type Card = { r: Rank; s: Suit };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function newDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });

  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardStr(c: Card): string {
  return `${c.r}${c.s}`;
}

function handStr(h: Card[]): string {
  return h.map(cardStr).join(" ");
}

function score(hand: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const c of hand) {
    if (c.r === "A") {
      total += 11;
      aces++;
    } else if (c.r === "K" || c.r === "Q" || c.r === "J") {
      total += 10;
    } else {
      total += Number(c.r);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function render(args: {
  player: Card[];
  dealer: Card[];
  revealDealer: boolean;
  stateLine: string;
}): string {
  const { player, dealer, revealDealer, stateLine } = args;

  const dealerShown = revealDealer ? dealer : [dealer[0]];
  const dealerHidden = revealDealer ? "" : " ??";
  const dealerScore = revealDealer ? ` (${score(dealer)})` : "";

  return [
    "🂡 **Blackjack**",
    "",
    `**Dealer:** ${handStr(dealerShown)}${dealerHidden}${dealerScore}`,
    `**You:** ${handStr(player)} (${score(player)})`,
    "",
    stateLine,
  ].join("\n");
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const deck = newDeck();
  const player: Card[] = [deck.pop()!, deck.pop()!];
  const dealer: Card[] = [deck.pop()!, deck.pop()!];

  const hitId = `bj:hit:${interaction.id}`;
  const standId = `bj:stand:${interaction.id}`;

  const row = (disabled = false) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(hitId)
        .setLabel("Hit")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(standId)
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );

  const immediate = score(player) === 21;

  let msg = await interaction.editReply({
    content: render({
      player,
      dealer,
      revealDealer: immediate,
      stateLine: immediate
        ? "Blackjack! Dealer reveals…"
        : "Choose **Hit** or **Stand**.",
    }),
    components: [row(immediate)],
  });

  if (immediate) {
    while (score(dealer) < 17) dealer.push(deck.pop()!);

    const p = score(player);
    const d = score(dealer);

    const outcome =
      d > 21
        ? "✅ Dealer busts. You win."
        : d === p
          ? "➖ Push. It's a tie."
          : d > p
            ? "❌ Dealer wins."
            : "✅ You win.";

    await interaction.editReply({
      content: render({ player, dealer, revealDealer: true, stateLine: outcome }),
      components: [row(true)],
    });
    return;
  }

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 90_000,
  });

  collector.on("collect", async (btn) => {
    try {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: "This is not your game.", ephemeral: true });
        return;
      }

      if (btn.customId !== hitId && btn.customId !== standId) return;

      await btn.deferUpdate();

      if (btn.customId === hitId) {
        player.push(deck.pop()!);

        const p = score(player);

        if (p > 21) {
          collector.stop("bust");
          await interaction.editReply({
            content: render({
              player,
              dealer,
              revealDealer: true,
              stateLine: "❌ Bust. You lose.",
            }),
            components: [row(true)],
          });
          return;
        }

        await interaction.editReply({
          content: render({
            player,
            dealer,
            revealDealer: false,
            stateLine: "Hit or Stand?",
          }),
          components: [row(false)],
        });
        return;
      }

      // stand
      collector.stop("stand");

      while (score(dealer) < 17) dealer.push(deck.pop()!);

      const p = score(player);
      const d = score(dealer);

      const outcome =
        d > 21
          ? "✅ Dealer busts. You win."
          : d === p
            ? "➖ Push. It's a tie."
            : d > p
              ? "❌ Dealer wins."
              : "✅ You win.";

      await interaction.editReply({
        content: render({ player, dealer, revealDealer: true, stateLine: outcome }),
        components: [row(true)],
      });
    } catch (err) {
      logger.warn({ err }, "[fun/blackjack] handler failed");
    }
  });

  collector.on("end", async (_c, reason) => {
    try {
      if (reason === "stand" || reason === "bust") return;

      await interaction.editReply({
        content: render({
          player,
          dealer,
          revealDealer: true,
          stateLine: "⏱️ Game expired. Run `/fun blackjack` to play again.",
        }),
        components: [row(true)],
      });
    } catch (err) {
      logger.debug({ err }, "[fun/blackjack] end edit failed");
    }
  });
}
