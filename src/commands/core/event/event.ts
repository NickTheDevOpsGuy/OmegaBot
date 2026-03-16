// src/commands/core/event/event.ts
// /event create | update | join | list | results — uses eventsService.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  createEvent,
  getEvent,
  listEvents,
  joinEvent,
  getEventParticipants,
  updateEventStatus,
  type EventStatus,
} from "../../../services/platform/eventsService.js";
import { getOrCreateByDiscord } from "../../../services/platform/userService.js";

export const data = new SlashCommandBuilder()
  .setName("event")
  .setDescription("Create, join, and manage platform events")
  .addSubcommand((s) =>
    s
      .setName("create")
      .setDescription("Create a new event")
      .addStringOption((o) =>
        o.setName("title").setDescription("Event title").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("description").setDescription("Event description"),
      )
      .addIntegerOption((o) =>
        o.setName("start_time").setDescription("Start time (Unix timestamp, seconds)"),
      )
      .addIntegerOption((o) =>
        o.setName("end_time").setDescription("End time (Unix timestamp, seconds)"),
      )
      .addStringOption((o) =>
        o
          .setName("status")
          .setDescription("Initial status")
          .addChoices(
            { name: "Draft", value: "draft" },
            { name: "Active", value: "active" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("update")
      .setDescription("Update an event's status")
      .addStringOption((o) =>
        o.setName("event_id").setDescription("Event ID").setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("status")
          .setDescription("New status")
          .addChoices(
            { name: "Draft", value: "draft" },
            { name: "Active", value: "active" },
            { name: "Ended", value: "ended" },
            { name: "Cancelled", value: "cancelled" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("join")
      .setDescription("Join an event")
      .addStringOption((o) =>
        o.setName("event_id").setDescription("Event ID").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("list")
      .setDescription("List events")
      .addStringOption((o) =>
        o
          .setName("status")
          .setDescription("Filter by status")
          .addChoices(
            { name: "Active", value: "active" },
            { name: "Ended", value: "ended" },
            { name: "Draft", value: "draft" },
          ),
      )
      .addIntegerOption((o) =>
        o.setName("limit").setDescription("Max events to show (default 10)"),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("results")
      .setDescription("View event participants and details")
      .addStringOption((o) =>
        o.setName("event_id").setDescription("Event ID").setRequired(true),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description");
    const startRaw = interaction.options.getInteger("start_time");
    const endRaw = interaction.options.getInteger("end_time");
    const status = (interaction.options.getString("status") as EventStatus) ?? "draft";
    const startTime = startRaw ? startRaw * 1000 : Date.now();
    const endTime = endRaw ? endRaw * 1000 : startTime + 24 * 60 * 60 * 1000;
    const event = createEvent({
      title,
      description: description ?? null,
      startTime,
      endTime,
      status,
    });
    await interaction.reply({
      content: `Event **${event.title}** created. ID: \`${event.eventId}\`. Use \`/event join event_id:${event.eventId}\` to join.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "update") {
    const eventId = interaction.options.getString("event_id", true);
    const status = interaction.options.getString("status") as EventStatus | null;
    const ev = getEvent(eventId);
    if (!ev) {
      await interaction.reply({ content: "Event not found.", ephemeral: true });
      return;
    }
    if (!status) {
      await interaction.reply({
        content: "Provide a `status` to update.",
        ephemeral: true,
      });
      return;
    }
    const ok = updateEventStatus(eventId, status);
    if (!ok) {
      await interaction.reply({ content: "Update failed.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `Event status set to **${status}**.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "join") {
    const eventId = interaction.options.getString("event_id", true);
    const platformUser = getOrCreateByDiscord(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL(),
    );
    const ok = joinEvent(eventId, platformUser.userId);
    if (!ok) {
      await interaction.reply({
        content: "Could not join. Event may not exist or may not be active.",
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({ content: "You joined the event.", ephemeral: true });
    return;
  }

  if (sub === "list") {
    const status = interaction.options.getString("status") as EventStatus | undefined;
    const limit = Math.min(25, interaction.options.getInteger("limit") ?? 5);
    const events = listEvents({ status, limit });
    const embed = new EmbedBuilder()
      .setTitle("Events")
      .setDescription(events.length === 0 ? "No events found." : null);
    for (const ev of events.slice(0, limit)) {
      const startR = `<t:${Math.floor(ev.startTime / 1000)}:R>`;
      const endR = `<t:${Math.floor(ev.endTime / 1000)}:R>`;
      embed.addFields({
        name: ev.title,
        value: `ID: \`${ev.eventId}\` | Status: **${ev.status}** | Starts ${startR} | Ends ${endR}`,
      });
    }
    if (events.length > limit) {
      embed.setFooter({ text: `Showing ${limit} of ${events.length} events` });
    } else if (events.length > 0) {
      embed.setFooter({ text: `${events.length} event(s)` });
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "results") {
    const eventId = interaction.options.getString("event_id", true);
    const ev = getEvent(eventId);
    if (!ev) {
      await interaction.reply({ content: "Event not found.", ephemeral: true });
      return;
    }
    const participants = getEventParticipants(eventId);
    const embed = new EmbedBuilder()
      .setTitle(ev.title)
      .setDescription(ev.description ?? null)
      .addFields(
        { name: "Status", value: ev.status, inline: true },
        { name: "Participants", value: String(participants.length), inline: true },
        {
          name: "Participant IDs",
          value: participants.length
            ? participants.map((p) => p.userId).join(", ")
            : "None",
        },
      )
      .setFooter({ text: `Event ID: ${ev.eventId}` });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  await interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
}
