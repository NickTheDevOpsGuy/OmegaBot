import type { Interaction, ChatInputCommandInteraction } from "discord.js";
import type { CommandClient } from "./commandLoader.js";

/**
 * Handles incoming interactions and dispatches slash commands to their registered executors.
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  /**
   * Ignore any interaction that is not a slash command.
   */
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  /**
   * If we have no handler for this command, reply to the user and stop.
   */
  if (!command) {
    await interaction.reply("Command not found");
    return;
  }

  /**
   * Execute the command safely. If it throws, log the error and reply with a generic failure message.
   * If the interaction already has a response, use editReply instead.
   */
  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("Something went wrong");
    } else {
      await interaction.reply("Something went wrong");
    }
  }
}
