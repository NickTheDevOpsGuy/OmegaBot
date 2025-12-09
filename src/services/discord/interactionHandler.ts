import type {
  Interaction,
  ChatInputCommandInteraction
} from "discord.js";
import type { CommandClient } from "./commandLoader.js";

export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply("Command not found");
    return;
  }

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
