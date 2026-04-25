// src/commands/help/helpText.ts
//
// Help text for the /help command. Organized by topic to stay under Discord's
// message limits while providing comprehensive documentation.

import type { CommandListItem } from "../../../services/discord/discord/commandMeta.js";
import { buildOverviewHelp } from "./topics/meta/overview.js";
import { buildChangelogHelp } from "./topics/meta/changelog.js";
import { buildSummaryHelp } from "./topics/meta/summary.js";
import { buildFunHelp } from "./topics/fun.js";
import { buildGamesHelp } from "./topics/games.js";
import { buildProfileHelp } from "./topics/profile.js";
import { buildQuotesHelp } from "./topics/quotes.js";
import { buildNotionHelp } from "./topics/notion.js";
import { buildGitHubHelp } from "./topics/github.js";
import { buildStatusHelp } from "./topics/status.js";
import { buildAdminHelp } from "./topics/admin.js";
import { buildCommandsHelp } from "./topics/meta/commands.js";
import { buildInfoHelp } from "./topics/info.js";
import { buildEventHelp } from "./topics/event.js";

export type HelpTopic =
  | "overview"
  | "fun"
  | "games"
  | "profile"
  | "quotes"
  | "notion"
  | "github"
  | "status"
  | "admin"
  | "commands"
  | "changelog"
  | "summary"
  | "info"
  | "event";

/**
 * Builds help text for the specified topic.
 */
export function buildHelpText(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
  topic: HelpTopic;
}): string {
  const { isAdmin, commands, topic } = args;

  switch (topic) {
    case "fun":
      return buildFunHelp();
    case "games":
      return buildGamesHelp();
    case "profile":
      return buildProfileHelp();
    case "quotes":
      return buildQuotesHelp();
    case "notion":
      return buildNotionHelp({ isAdmin });
    case "github":
      return buildGitHubHelp();
    case "status":
      return buildStatusHelp();
    case "admin":
      return buildAdminHelp({ isAdmin });
    case "commands":
      return buildCommandsHelp({ isAdmin, commands });
    case "changelog":
      return buildChangelogHelp();
    case "summary":
      return buildSummaryHelp();
    case "info":
      return buildInfoHelp();
    case "event":
      return buildEventHelp();
    case "overview":
    default:
      return buildOverviewHelp({ isAdmin });
  }
}
