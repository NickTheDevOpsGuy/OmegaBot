import type { Client } from "discord.js";
import { initRemindersSchema } from "./schema.js";
import { ReminderScheduler } from "./scheduler.js";

export function createReminderScheduler(client: Client): ReminderScheduler {
  initRemindersSchema();
  return new ReminderScheduler(client, { pollEveryMs: 5000 });
}
