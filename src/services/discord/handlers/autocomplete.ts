import type { AutocompleteInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import type { CommandClient } from "../commandLoader.js";

export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  client: CommandClient,
): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  const autocomplete =
    command && typeof command === "object" && "autocomplete" in command
      ? (command as { autocomplete?: (i: AutocompleteInteraction) => Promise<void> })
          .autocomplete
      : undefined;

  try {
    if (autocomplete && typeof autocomplete === "function") {
      await autocomplete(interaction);
    } else {
      await interaction.respond([]);
    }
  } catch (err) {
    logger.warn(
      { err, command: interaction.commandName, interactionId: interaction.id },
      "[interaction] autocomplete failed",
    );
    try {
      await interaction.respond([]);
    } catch {
      // ignore
    }
  }
}
