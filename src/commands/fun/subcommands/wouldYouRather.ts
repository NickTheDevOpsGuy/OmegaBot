// src/commands/fun/subcommands/wouldYouRather.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";

type Wyr = { a: string; b: string };

const QUESTIONS: Wyr[] = [
  { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
  { a: "Speak all languages", b: "Talk to animals" },
  { a: "Never need sleep", b: "Never need food" },
  { a: "Have flight", b: "Have invisibility" },
  { a: "Only listen to one song forever", b: "Only watch one movie forever" },
  { a: "Fight one horse-sized duck", b: "Fight 100 duck-sized horses" },
  { a: "Live on the beach", b: "Live in the mountains" },
  {
    a: "Teleport anywhere (but only once a day)",
    b: "Read minds (but only for 5 minutes a day)",
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const q = pick(QUESTIONS);

  const aId = `wyr:a:${interaction.id}`;
  const bId = `wyr:b:${interaction.id}`;

  let aVotes = 0;
  let bVotes = 0;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(aId).setLabel("A").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(bId).setLabel("B").setStyle(ButtonStyle.Primary),
  );

  const render = () =>
    [
      "**Would you rather…**",
      "",
      `**A)** ${q.a}`,
      `**B)** ${q.b}`,
      "",
      `Votes: A=${aVotes} | B=${bVotes}`,
      "_Tap A or B to vote. (Votes close after 60s.)_",
    ].join("\n");

  const msg = await interaction.editReply({ content: render(), components: [row] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  const voters = new Set<string>();

  collector.on("collect", async (btn) => {
    try {
      if (btn.user.bot) return;

      if (btn.customId !== aId && btn.customId !== bId) return;

      // one vote per user
      if (voters.has(btn.user.id)) {
        await btn.reply({ content: "You already voted on this one.", ephemeral: true });
        return;
      }
      voters.add(btn.user.id);

      if (btn.customId === aId) aVotes++;
      else bVotes++;

      await btn.deferUpdate();
      await interaction.editReply({ content: render() });
    } catch (err) {
      logger.warn({ err }, "[fun/wouldYouRather] vote handler failed");
    }
  });

  collector.on("end", async () => {
    try {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(aId)
          .setLabel("A")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(bId)
          .setLabel("B")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );

      await interaction.editReply({
        content: render().replace("(Votes close after 60s.)", "(Voting closed.)"),
        components: [disabledRow],
      });
    } catch (err) {
      logger.debug({ err }, "[fun/wouldYouRather] end edit failed");
    }
  });
}
