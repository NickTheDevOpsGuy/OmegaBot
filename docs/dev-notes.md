# Development Notes

This page collects the main engineering conventions for OmegaBot: structure, testing, logging, error handling, and a few Discord-specific implementation rules.

Use this page for team conventions. Use [Project structure](project-structure.md) for the codebase map and [Troubleshooting](troubleshooting.md) for operational debugging.

---

## Table of Contents

- [Codebase Shape](#codebase-shape)
- [Comments And Documentation](#comments-and-documentation)
- [Testing](#testing)
- [Logging](#logging)
- [User-Facing Errors](#user-facing-errors)
- [Autocomplete And Interaction Handling](#autocomplete-and-interaction-handling)
- [Configuration And Feature Gating](#configuration-and-feature-gating)
- [TypeScript And Discord.js Notes](#typescript-and-discordjs-notes)
- [Troubleshooting And Future Work](#troubleshooting-and-future-work)

---

## Codebase Shape

### File and Folder Limits

- Keep source and test files under roughly 300 lines when practical.
- Aim for at most 10 direct children per folder so navigation and imports stay manageable.
- Split large files by extracting helpers, types, or focused modules instead of adding more internal sectioning.

### Service Layout

`src/services` is organized into four broad areas:

- `core/` - config, database, logging, metrics, cache, dashboard, circuit breaker, analytics, time
- `discord/discord/` - command loading, interaction handling, rate limits, Discord-specific utilities
- `integrations/` - AI, GitHub, weather, statuspage, FAQ, welcome, starboard, summary, Notion
- `stores/` - quotes, reminders, timezone, transcript, game stats, fun, joke, roles

### Architecture Principles

- Commands stay thin and delegate work to services.
- Services are grouped by domain rather than by command.
- Pure helpers stay pure where possible.
- Side effects like network, filesystem, database, and Discord I/O should be explicit and easy to trace.

### Code Organization Pointers

For the full folder layout, see [Project structure](project-structure.md).

| Area                                | Location                                           |
| ----------------------------------- | -------------------------------------------------- |
| Database typed helpers              | `src/services/core/database/db.ts`                 |
| Help topic content                  | `src/commands/core/help/topics/*.ts`               |
| Interaction routing and errors      | `src/services/discord/discord/interaction/`        |
| Interaction handlers                | `src/services/discord/discord/handlers/`           |
| Fun subcommand groups               | `src/commands/games/fun/funSubcommands/`           |
| Giveaway button logic               | `src/commands/games/giveaway/buttonHandler.ts`     |
| Quote store                         | `src/services/stores/quotes/quoteStore.ts`         |
| Command usage analytics             | `src/services/core/analytics/commandUsageStore.ts` |
| Request context and correlation IDs | `src/services/core/logging/requestContext.ts`      |
| i18n                                | `src/i18n/index.ts`                                |

---

## Comments And Documentation

- Prefer a short file-purpose comment at the top only when the module is not already obvious.
- Use JSDoc for exported functions or behavior with side effects, recovery rules, or unusual assumptions.
- Use section headers like `/* ----- Section ----- */` sparingly in long files.
- Comment why something is done, not just what the code already says.
- When docs overlap, keep one page as the source of truth and link to it instead of restating the same instructions.

---

## Testing

### Test Placement

- Unit and integration tests are colocated near the code they exercise.
- Use `*.test.ts`, `*.spec.ts`, or `*.integration.test.ts`.
- There is no central `src/test` folder.

### DB-Backed Tests

- Tests that need SQLite should use `useInMemoryDb()` from `src/services/core/database/dbTestUtils.ts`.
- Prefer in-memory DBs for fast, isolated tests.

### Common Commands

- `npm test` - watch mode
- `npm run test:run` - one-shot CI-style run
- `npm run test:coverage` - coverage report

### Manual Testing

When changing commands or interactions, test:

- success paths
- invalid input paths
- permission failures
- DM vs guild behavior
- ephemeral vs public replies where relevant

---

## Logging

### Logging Standards

- OmegaBot uses a shared pino logger in `src/utils/logger.ts`.
- Use `LOG_LEVEL` to control verbosity and `LOG_PRETTY` for local readability.
- Use `getContextLogger()` inside command handlers and interaction flows so logs include `requestId`.
- Use the base `logger` for startup, bootstrapping, and code that does not run inside an interaction context.

### Log Levels

- `info` for lifecycle events and normal observability
- `warn` for recoverable problems
- `error` for failures that need investigation
- `debug` for noisy investigation detail

### What To Log

- Log command boundaries, service entry points, and recovery decisions.
- Include `err` objects in structured logs instead of flattening them into strings.
- Never log secrets such as `DISCORD_TOKEN`, API keys, or raw credential values.

### Interaction Recovery Notes

- `safeReply` may fall back to `followUp` after an initial failure.
- Known Discord interaction errors like `10008`, `10062`, and `40060` are logged intentionally with context rather than treated as mysterious crashes.
- Look for `interactionFailedRecovery: true` when debugging "interaction failed" reports.

---

## User-Facing Errors

- Users should not see stack traces, raw internal exceptions, secret names, or configuration internals unless there is a strong admin-only reason.
- Prefer short, actionable replies.
- Use `getUserFacingReason(err)` from `src/utils/errors.ts` when mapping internal failures to user-safe language.
- Use `errorReply(interaction, message, suggestions?)` from `src/utils/interactions.ts` when you want a consistent error format.
- Keep detailed diagnosis in logs and, where appropriate, in admin audit channels instead of regular user replies.

---

## Autocomplete And Interaction Handling

### Autocomplete

When an option uses `setAutocomplete(true)`, implement the command module's optional `autocomplete` handler and respond within Discord's time window.

```typescript
export const data = new SlashCommandBuilder().addStringOption((o) =>
  o.setName("zone").setDescription("Timezone").setAutocomplete(true),
);

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused();
  const choices = getMatchingTimezones(focused).slice(0, 25);
  await interaction.respond(choices.map((z) => ({ name: z, value: z })));
}
```

If a command does not implement autocomplete, the interaction handler should respond safely with an empty list rather than timing out.

### Preventing "Interaction Failed"

Collectors and interactive handlers should:

1. Acknowledge early with `deferReply()`, `deferUpdate()`, `reply()`, or `update()`.
2. Do expensive work only after acknowledgement.
3. Catch handler errors and try to recover gracefully.

For deeper debugging, see [Troubleshooting](troubleshooting.md).

---

## Configuration And Feature Gating

Environment variables control both secrets and optional feature enablement.

Guidelines:

- Required config should fail fast at startup.
- Optional features should disable cleanly when their config is missing.
- Feature-specific code should never assume optional config exists.

Examples:

- GitHub polling only runs when its required GitHub config is present.
- LLM summaries only run when `SUMMARY_MODE=llm` and the needed API key exists.
- Hangman word management only appears for users with the configured role.
- Notion admin actions only work when the Notion config is valid and the caller has the right Discord-side access.

See [Environment Configuration](setup-env.md) for the full config surface.

---

## TypeScript And Discord.js Notes

### Strict Type Safety

OmegaBot uses TypeScript strict mode. Prefer narrowing over assertions whenever possible.

### Discord.js v14 Reminders

- `GatewayIntentBits` replaces old intent flags
- `ChatInputCommandInteraction` replaces older chat-command types
- `MessageFlags.Ephemeral` replaces older `ephemeral: true` usage in many code paths
- `PermissionFlagsBits` replaces older permission flag enums

### Type Narrowing

Always narrow interaction types before using specific APIs:

```typescript
if (interaction.isChatInputCommand()) {
  // Safe to use chat-input methods
}

if (interaction.inGuild()) {
  // Safe to use guild-specific data
}
```

When checking result objects, narrow by property presence before consuming optional fields.

---

## Troubleshooting And Future Work

For operational debugging, see [Troubleshooting](troubleshooting.md).

Areas still worth improving:

- replace remaining file stores with database-backed storage where appropriate
- add more integration tests for collector-heavy flows
- keep reducing doc overlap by linking to source-of-truth pages instead of repeating setup steps
