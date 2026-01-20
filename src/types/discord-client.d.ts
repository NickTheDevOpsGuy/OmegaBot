import type { ReminderScheduler } from "../services/reminders/scheduler.js";

declare module "discord.js" {
  interface Client {
    reminderScheduler?: ReminderScheduler;
  }
}
