import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Ping test with latency");

export async function execute(interaction) {
  const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });

  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = interaction.client.ws.ping;

  await interaction.editReply(
    `Pong. Round trip latency is ${latency}ms. WebSocket heartbeat is ${wsPing}ms.`
  );
}