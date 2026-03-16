export function buildEventHelp(): string {
  return [
    "**Help: Events**",
    "",
    "Create, join, and manage platform events (tournaments, challenges, community events).",
    "",
    "**Commands**",
    "`/event create`    Create an event (title, optional description, start/end times, status)",
    "`/event update`    Change an event's status (draft, active, ended, cancelled)",
    "`/event join`      Join an active event (use the event_id from create or list)",
    "`/event list`      List events (filter by status, set limit)",
    "`/event results`   View event details and participants",
    "",
    "**Flow**",
    "1. Create an event with `/event create` (status can be draft or active).",
    "2. Set status to **active** with `/event update` when ready for sign-ups.",
    "3. You and others use `/event join event_id:<id>` to join.",
    "4. Use `/event results event_id:<id>` to see who joined.",
    "5. Set status to **ended** or **cancelled** when done.",
    "",
    "**Web**",
    "The same events appear on the Web API. Use GET /api/events and POST /api/events/:id/join with auth.",
  ].join("\n");
}
