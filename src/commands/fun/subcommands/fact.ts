// src/commands/fun/subcommands/fact.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";

const FACTS = [
  // Animals
  "A group of flamingos is called a 'flamboyance'.",
  "Octopuses have three hearts and blue blood.",
  "Cows have best friends and get stressed when separated.",
  "A snail can sleep for three years.",
  "Elephants are the only animals that can't jump.",
  "A shrimp's heart is in its head.",
  "Dolphins sleep with one eye open.",
  "Butterflies taste with their feet.",
  "Koalas sleep up to 22 hours a day.",
  "A group of crows is called a murder.",
  "Cats have over 20 vocalizations, including the meow.",
  "Sloths can hold their breath longer than dolphins - up to 40 minutes.",
  "A single elephant tooth can weigh up to 9 pounds.",
  "Pigeons can do math at a level similar to monkeys.",
  "Wombat poop is cube-shaped.",
  "Some sharks can glow in the dark (bioluminescence).",
  "A blue whale's heart is so big a small child can swim through its arteries.",
  "Mantis shrimp can punch at speeds up to 50 mph.",
  "Axolotls can regenerate their limbs, heart, and even parts of their brain.",
  "Honey badgers can withstand bee stings and even snake venom.",

  // Space
  "There are more stars in the universe than grains of sand on Earth.",
  "A day on Venus is longer than its year.",
  "Neutron stars can spin 600 times per second.",
  "Space is completely silent because there's no atmosphere.",
  "The footprints on the Moon will be there for 100 million years.",
  "One million Earths could fit inside the Sun.",
  "Saturn would float if placed in water (if you found a big enough bathtub).",
  "There are more trees on Earth than stars in the Milky Way.",
  "A year on Mercury is just 88 Earth days.",
  "The largest known star could fit 5 billion suns inside it.",
  "It rains diamonds on Neptune and Uranus.",
  "A teaspoon of neutron star material weighs about 6 billion tons.",
  "The Sun makes up 99.86% of the mass in our solar system.",
  "Light from the Sun takes 8 minutes to reach Earth.",
  "There's a planet made largely of diamond (55 Cancri e).",

  // Human Body
  "Your brain uses 20% of your body's total oxygen and blood.",
  "Human bones are stronger than steel of the same density.",
  "Your nose can remember 50,000 different scents.",
  "Humans share 60% of their DNA with bananas.",
  "The human eye can distinguish about 10 million different colors.",
  "Your heart beats about 100,000 times per day.",
  "Humans are the only animals that blush.",
  "The strongest muscle in the human body is the jaw.",
  "Your brain generates enough electricity to power a small light bulb.",
  "Babies are born with 300 bones, but adults only have 206.",
  "The acid in your stomach is strong enough to dissolve zinc.",
  "Your body produces 25 million new cells each second.",
  "The cornea is the only part of the body with no blood supply.",
  "You produce about 25,000 quarts of saliva in a lifetime.",
  "Your blood vessels, if laid end to end, would circle Earth twice.",

  // Technology
  "The first computer virus was created in 1983.",
  "Email existed before the World Wide Web.",
  "The first iPhone had only 2 megapixels.",
  "More people have mobile phones than toilets globally.",
  "The average person spends 6 months of their life waiting for red lights.",
  "The first webcam was used to monitor a coffee pot at Cambridge.",
  "92% of the world's currency exists only on computers.",
  "The first computer mouse was made of wood.",
  "QWERTY keyboards were designed to slow down typing to prevent jams.",
  "Google's first storage was made of LEGO.",
  "The average person unlocks their phone 150 times a day.",
  "The first 1GB hard drive weighed 550 pounds and cost $40,000.",
  "Nintendo was founded in 1889 as a playing card company.",
  "The first text message said 'Merry Christmas' in 1992.",
  "Amazon started as an online bookstore in Jeff Bezos's garage.",

  // History
  "Cleopatra lived closer in time to the Moon landing than to the building of the pyramids.",
  "Oxford University is older than the Aztec Empire.",
  "The shortest war in history lasted 38 minutes.",
  "Ancient Romans used crushed mouse brains as toothpaste.",
  "Vikings used to give kittens to new brides as wedding gifts.",
  "In ancient Greece, throwing an apple at someone meant declaring love.",
  "The Eiffel Tower can grow up to 6 inches taller in summer.",
  "The Great Wall of China is held together by sticky rice.",
  "Coca-Cola originally contained cocaine.",
  "Napoleon was once attacked by a horde of bunnies.",
  "The first marathon runner died immediately after finishing.",
  "Ancient Egyptians used honey to embalm bodies.",
  "The Roman Emperor Caligula made his horse a senator.",
  "Before alarm clocks, people were paid to knock on windows to wake workers.",
  "The printing press helped standardize spelling.",

  // Random
  "Bananas are berries, but strawberries aren't.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The inventor of the Pringles can is buried in one.",
  "Scotland's national animal is the unicorn.",
  "There's a basketball court on the top floor of the U.S. Supreme Court building.",
  "A group of pugs is called a grumble.",
  "The shortest complete sentence in English is 'I am.'",
  "Hot water freezes faster than cold water under certain conditions.",
  "The average cloud weighs about 1.1 million pounds.",
  "Vending machines are twice as likely to kill you as sharks.",
  "There are more possible chess games than atoms in the observable universe.",
  "A bolt of lightning is five times hotter than the surface of the sun.",
  "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs.",
  "The inventor of the fire hydrant is unknown because the patent was lost in a fire.",
  "A 'moment' is a medieval unit of time equal to 90 seconds.",
  "Cans of Diet Coke float in water while regular Coke sinks.",
  "A flock of ravens is called an unkindness.",
  "The dot over the letters 'i' and 'j' is called a tittle.",
  "Bubble wrap was originally invented as wallpaper.",
  "The average person walks the equivalent of 5 times around the world in their lifetime.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.user.id;
  logger.info({ userId }, "[fact] command");

  try {
    const fact = pick(FACTS);

    const embed = new EmbedBuilder()
      .setTitle("💡 Did You Know?")
      .setDescription(fact)
      .setColor(0x5865f2)
      .setFooter({ text: "Use /fun fact for another random fact!" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, userId }, "[fact] failed");
    await interaction.editReply("Something went wrong fetching a fact. Try again.");
  }
}
