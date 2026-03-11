// src/commands/fun/subcommands/poll.ts
// Create polls and record votes via buttons; stored in pollStore.
import { MessageFlags } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  createPoll,
  recordVote,
  type StoredPoll,
} from "../../../../../../services/stores/fun/pollStore.js";

type PollOption = {
  label: string;
  index: number;
};

function buildPollEmbed(poll: StoredPoll): EmbedBuilder {
  const totalVotes = poll.counts.reduce((acc: number, n: number) => acc + n, 0);

  const lines = poll.options.map((opt: string, idx: number) => {
    const n = poll.counts[idx] ?? 0;
    return `• **${opt}**: ${n}`;
  });

  return new EmbedBuilder()
    .setTitle("📊 Fun Poll")
    .setDescription(
      [`**${poll.question}**`, "", ...lines, "", `Total votes: **${totalVotes}**`].join(
        "\n",
      ),
    )
    .setFooter({ text: `Poll ID: ${poll.messageId}` });
}

function buildPollButtons(
  poll: StoredPoll,
  opts?: { disabled?: boolean },
): ActionRowBuilder<ButtonBuilder>[] {
  const disabled = opts?.disabled ?? false;

  // Discord max 5 buttons per row. We have 2–4 options: one row is fine.
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (let i = 0; i < poll.options.length; i += 1) {
    const label = poll.options[i] ?? `Option ${i + 1}`;

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`funpoll:${poll.messageId}:${i}`)
        .setLabel(label.length > 80 ? `${label.slice(0, 77)}...` : label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );
  }

  return [row];
}

function parseOptions(interaction: ChatInputCommandInteraction): PollOption[] {
  const o1 = interaction.options.getString("option1", true).trim();
  const o2 = interaction.options.getString("option2", true).trim();
  const o3 = interaction.options.getString("option3")?.trim() ?? "";
  const o4 = interaction.options.getString("option4")?.trim() ?? "";

  const raw = [o1, o2, o3, o4].filter((s: string) => s.length > 0);

  // Deduplicate exact duplicates (case-insensitive) to avoid confusion
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of raw) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }

  // Enforce 2–4 options (after dedupe)
  if (unique.length < 2) throw new Error("Poll must have at least 2 unique options.");
  if (unique.length > 4) throw new Error("Poll can have at most 4 options.");

  return unique.map((label: string, index: number) => ({ label, index }));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const question = interaction.options.getString("question", true).trim();

  let opts: PollOption[];
  try {
    opts = parseOptions(interaction);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid poll options.";
    await interaction.editReply(msg);
    return;
  }

  // Create a placeholder message first so we can use messageId as pollId.
  const placeholder = new EmbedBuilder()
    .setTitle("📊 Fun Poll")
    .setDescription("Creating poll…");
  await interaction.editReply({ embeds: [placeholder] });

  const sent = await interaction.fetchReply();
  const messageId = sent.id;

  const poll = await createPoll({
    messageId,
    channelId: sent.channelId,
    guildId: sent.guildId ?? null,
    creatorUserId: interaction.user.id,
    question,
    options: opts.map((o: PollOption) => o.label),
  });

  logger.info(
    { messageId, userId: interaction.user.id, question: question.slice(0, 50) },
    "[poll] created",
  );

  let latestPoll: StoredPoll = poll;

  await interaction.editReply({
    embeds: [buildPollEmbed(latestPoll)],
    components: buildPollButtons(latestPoll),
  });

  // Collector is in-memory: if the bot restarts, existing polls won’t accept votes anymore.
  const collector = sent.createMessageComponentCollector({
    time: 1000 * 60 * 60 * 24, // 24h
  });

  collector.on("collect", async (btn: ButtonInteraction) => {
    try {
      if (!btn.customId.startsWith("funpoll:")) {
        await btn.deferUpdate().catch(() => {});
        return;
      }

      const parts = btn.customId.split(":");
      // funpoll:<messageId>:<idx>
      const pollId = parts[1] ?? "";
      const idxStr = parts[2] ?? "";
      const optionIndex = Number(idxStr);

      if (pollId !== messageId) {
        await btn.deferUpdate().catch(() => {});
        return;
      }

      if (
        !Number.isFinite(optionIndex) ||
        optionIndex < 0 ||
        optionIndex >= latestPoll.options.length
      ) {
        await btn.reply({
          content: "Invalid poll option.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Acknowledge immediately so recordVote (file I/O) doesn't cause "interaction failed"
      await btn.deferUpdate();

      const result = await recordVote({
        messageId: pollId,
        userId: btn.user.id,
        optionIndex,
      });

      if (result.kind === "alreadyVoted") {
        await btn.followUp({
          content: `You already voted: **${
            latestPoll.options[result.previousOptionIndex] ?? "Unknown"
          }**`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (result.kind === "notFound") {
        await btn.followUp({
          content: "Poll not found (maybe it expired).",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Updated poll snapshot
      latestPoll = result.poll;

      await interaction.editReply({
        embeds: [buildPollEmbed(latestPoll)],
        components: buildPollButtons(latestPoll),
      });
    } catch (err) {
      logger.warn({ err }, "[fun/poll] vote handling failed");
      try {
        if (!btn.replied && !btn.deferred) {
          await btn.reply({
            content: "Something went wrong recording that vote.",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        // ignore
      }
    }
  });

  collector.on("end", async () => {
    // Disable buttons when done
    try {
      await interaction.editReply({
        embeds: [buildPollEmbed(latestPoll)],
        components: buildPollButtons(latestPoll, { disabled: true }),
      });
    } catch (err) {
      logger.debug({ err }, "[fun/poll] failed to disable buttons on end");
    }
  });
}
