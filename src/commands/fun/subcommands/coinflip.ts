import type { ChatInputCommandInteraction } from "discord.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.editReply("ok");
}
