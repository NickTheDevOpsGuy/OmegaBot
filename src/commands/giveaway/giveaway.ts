// src/commands/giveaway/giveaway.ts
//
// Giveaway command handler.
// Database operations are in giveawayStore.ts. Subcommand logic in handlers.ts.

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { getActiveGiveaways, getEndedGiveaways } from "./giveawayStore.js";
import { handleStart, handleEnd, handleReroll, handleList } from "./handlers.js";

/* -------------------------------------------------------------------------- */
/* Command Definition                                                          */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Create and manage giveaways")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Start a new giveaway")
      .addStringOption((o) =>
        o
          .setName("prize")
          .setDescription("What are you giving away?")
          .setRequired(true)
          .setMaxLength(200),
      )
      .addStringOption((o) =>
        o
          .setName("duration")
          .setDescription("How long? (e.g., 1h, 30m, 1d)")
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName("winners")
          .setDescription("Number of winners (default 1)")
          .setMinValue(1)
          .setMaxValue(10),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("end")
      .setDescription("End a giveaway early")
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("Giveaway ID")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("reroll")
      .setDescription("Pick new winners for an ended giveaway")
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("Giveaway ID")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("List active giveaways"));

/* -------------------------------------------------------------------------- */
/* Autocomplete                                                                 */
/* -------------------------------------------------------------------------- */

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "id" || !interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const giveaways =
    sub === "end"
      ? getActiveGiveaways(interaction.guildId)
      : getEndedGiveaways(interaction.guildId);

  const needle = String(focused.value || "")
    .trim()
    .toLowerCase();
  const choices = giveaways
    .filter(
      (g) =>
        !needle ||
        String(g.id).includes(needle) ||
        g.prize.toLowerCase().includes(needle),
    )
    .slice(0, 25)
    .map((g) => ({
      name: `#${g.id}: ${g.prize.slice(0, 80)}${g.prize.length > 80 ? "…" : ""}`,
      value: g.id,
    }));

  await interaction.respond(
    choices.length ? choices : [{ name: "No giveaways found", value: 0 }],
  );
}

/* -------------------------------------------------------------------------- */
/* Command Execution                                                           */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "start") {
    await handleStart(interaction);
  } else if (sub === "end") {
    await handleEnd(interaction);
  } else if (sub === "reroll") {
    await handleReroll(interaction);
  } else if (sub === "list") {
    await handleList(interaction);
  }
}

export { handleGiveawayButton } from "./buttonHandler.js";
