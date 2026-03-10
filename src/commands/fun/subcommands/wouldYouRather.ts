// src/commands/fun/subcommands/wouldYouRather.ts
// "Would you rather" poll: pick one of two options via buttons.
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../services/metrics/server.js";

type Wyr = [string, string];

const QUESTIONS: Wyr[] = [
  // Classic
  ["Be able to fly", "Be able to turn invisible"],
  ["Have unlimited money", "Have unlimited time"],
  ["Live without music", "Live without movies"],
  ["Always be 10 minutes late", "Always be 20 minutes early"],
  ["Know how you will die", "Know when you will die"],
  ["Have no internet", "Have no air conditioning/heating"],
  ["Be famous but hated", "Be unknown but loved"],
  ["Read minds", "Predict the future"],
  ["Speak every language fluently", "Play every instrument perfectly"],
  ["Live in the wilderness", "Live in a big city forever"],

  // Fun/Silly
  ["Fight one horse-sized duck", "Fight 100 duck-sized horses"],
  ["Have a dragon", "Be a dragon"],
  ["Be Batman", "Be Iron Man"],
  ["Have hands for feet", "Have feet for hands"],
  [
    "Sneeze every time someone thinks about you",
    "Hiccup every time someone says your name",
  ],
  ["Have a rewind button for life", "Have a pause button for life"],
  ["Only eat pizza forever", "Never eat pizza again"],
  ["Have a pet dinosaur", "Have a pet alien"],
  ["Have Alexa's voice", "Have Siri's voice"],
  ["Live in Harry Potter world", "Live in Marvel universe"],

  // Deep/Philosophical
  ["Never use social media again", "Never watch TV/movies again"],
  ["Have free WiFi everywhere", "Have free coffee everywhere"],
  ["Be able to teleport", "Be able to time travel"],
  ["Never age physically", "Never age mentally"],
  ["Have a personal chef", "Have a personal chauffeur"],
  ["Be incredibly funny", "Be incredibly smart"],
  ["Live without your phone", "Live without your computer"],
  ["Always speak your mind", "Never speak again"],
  ["Know all languages", "Know how to code anything"],
  ["Have a perfect memory", "Have the ability to forget anything"],

  // Adventure
  ["Explore space", "Explore the deep ocean"],
  ["Live 100 years in the past", "Live 100 years in the future"],
  ["Have a home in the mountains", "Have a home on the beach"],
  ["Be a vampire", "Be a werewolf"],
  ["Climb Mount Everest", "Walk across the Sahara Desert"],
  ["Have free flights forever", "Have free hotels forever"],
  ["Live in a haunted mansion", "Live in a tiny house"],
  ["Have super strength", "Have super speed"],
  ["Control fire", "Control water"],
  ["Be the funniest person", "Be the smartest person"],

  // Career/Life
  ["Be a famous musician", "Be a famous actor"],
  ["Work your dream job for minimum wage", "Work a boring job for 6 figures"],
  ["Be extremely lucky", "Be extremely talented"],
  ["Never have to sleep", "Never have to eat"],
  ["Always know when people are lying", "Always get away with lying"],
  ["Have all your texts read aloud", "Have all your search history public"],
  ["Be stuck in an elevator", "Be stuck in traffic"],
  ["Lose all your photos", "Lose all your music"],
  ["Have a pause button", "Have a rewind button"],
  ["Control time", "Control space"],
];

import { SHORT_TIMEOUT_MS } from "../../../constants.js";

const VOTE_TIMEOUT_MS = SHORT_TIMEOUT_MS;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const [optionA, optionB] = pick(QUESTIONS);
  const gameId = `wyr-${Date.now()}`;
  const votes = new Map<string, "A" | "B">();

  const buildEmbed = (ended = false) => {
    const votesA = [...votes.values()].filter((v) => v === "A").length;
    const votesB = [...votes.values()].filter((v) => v === "B").length;
    const totalVotes = votes.size;

    const embed = new EmbedBuilder()
      .setTitle("🤔 Would You Rather...")
      .setColor(0x5865f2);

    if (ended && totalVotes > 0) {
      const pctA = Math.round((votesA / totalVotes) * 100);
      const pctB = Math.round((votesB / totalVotes) * 100);

      const barLength = 10;
      const barA = "█"
        .repeat(Math.round((pctA / 100) * barLength))
        .padEnd(barLength, "░");
      const barB = "█"
        .repeat(Math.round((pctB / 100) * barLength))
        .padEnd(barLength, "░");

      embed.addFields(
        {
          name: "🅰️ Option A",
          value: `${optionA}\n\`${barA}\` ${pctA}% (${votesA})`,
          inline: false,
        },
        {
          name: "🅱️ Option B",
          value: `${optionB}\n\`${barB}\` ${pctB}% (${votesB})`,
          inline: false,
        },
      );

      let result = "";
      if (votesA > votesB) {
        result = "🏆 **Option A wins!**";
      } else if (votesB > votesA) {
        result = "🏆 **Option B wins!**";
      } else {
        result = "🤝 **It's a tie!**";
      }
      embed.setDescription(result);
      embed.setFooter({
        text: `Voting ended • ${totalVotes} total vote${totalVotes === 1 ? "" : "s"}`,
      });
    } else {
      embed.addFields(
        { name: "🅰️ Option A", value: optionA, inline: true },
        { name: "🅱️ Option B", value: optionB, inline: true },
      );
      embed.setFooter({
        text: `Vote within 60 seconds! • ${totalVotes} vote${totalVotes === 1 ? "" : "s"}`,
      });
    }

    return embed;
  };

  const buildButtons = (disabled = false) => {
    const votesA = [...votes.values()].filter((v) => v === "A").length;
    const votesB = [...votes.values()].filter((v) => v === "B").length;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${gameId}:A`)
        .setLabel(disabled ? `Option A (${votesA})` : "Option A")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🅰️")
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${gameId}:B`)
        .setLabel(disabled ? `Option B (${votesB})` : "Option B")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🅱️")
        .setDisabled(disabled),
    );
  };

  const message = await interaction.editReply({
    embeds: [buildEmbed()],
    components: [buildButtons()],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: VOTE_TIMEOUT_MS,
    filter: (i) => i.customId.startsWith(gameId),
  });

  collector.on("collect", async (buttonInteraction) => {
    try {
      const choice = buttonInteraction.customId.split(":")[1] as "A" | "B";
      const previousVote = votes.get(buttonInteraction.user.id);

      if (previousVote === choice) {
        await buttonInteraction.reply({
          content: `You already voted for Option ${choice}!`,
          ephemeral: true,
        });
        return;
      }

      // Acknowledge immediately so we don't hit Discord's 3s limit
      await buttonInteraction.deferUpdate();

      votes.set(buttonInteraction.user.id, choice);
      await interaction.editReply({
        embeds: [buildEmbed()],
        components: [buildButtons()],
      });

      const changeText = previousVote ? " (changed vote)" : "";
      await buttonInteraction.followUp({
        content: `You voted for **Option ${choice}**!${changeText}`,
        ephemeral: true,
      });
    } catch (err) {
      recordInteractionRecovery("wouldYouRather");
      logger.warn(
        { err, interactionFailedRecovery: true },
        "[fun/wouldYouRather] vote handler failed",
      );
      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({
        embeds: [buildEmbed(true)],
        components: [buildButtons(true)],
      });
    } catch (err) {
      logger.debug({ err }, "[fun/wouldYouRather] end edit failed");
    }
  });
}
