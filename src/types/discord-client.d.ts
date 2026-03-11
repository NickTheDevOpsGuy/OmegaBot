import type { ReminderScheduler } from "../services/stores/reminders/scheduler.js";

declare module "discord.js" {
  interface Client {
    reminderScheduler?: ReminderScheduler;
  }
}
