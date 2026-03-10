# Development Notes

This document captures design decisions, conventions, and architectural guidelines for OmegaBot.

---

## File and Folder Limits

- **File size:** Keep source and test files under 300 lines. Split by extracting helpers, types, or test suites.
- **Folder size:** Aim for at most 10 direct children (files + subdirs) per folder. This keeps navigation and imports manageable.
- **Current exception:** `src/commands/fun/subcommands` has 39 items (game entry points, stores, tests, subdirs). Reorganizing into e.g. `games/` and `utility/` subfolders would satisfy the limit but requires broad import and execute.ts changes; consider it for a dedicated refactor.

---

## Comments

- **File purpose:** Prefer a short comment at the top (path and/or one line describing the module). Example: `// Fun command execution: handler registry, usage tracking, subcommand routing.`
- **JSDoc:** Use for exported functions and non-obvious behavior (e.g. recovery logic, side effects). Not required for every small helper.
- **Section headers:** Use `/* ----- Section ----- */` sparingly in long files to separate logical blocks (e.g. Database, Handlers).
- **In-code:** Comment _why_ when it’s not obvious from the code; avoid restating what the code does.

---

## Architecture Principles

- Commands are thin and delegate logic to services
- Services are grouped by domain (discord, github, transcript, summary, timezone)
- Helpers are pure where possible
- Side effects (network, fs, Discord I/O) are explicit

---

## Code Organization

| Area                               | Location                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Database typed helpers             | `src/services/database/db.ts` (`getRow<T>`, `getAll<T>` for SQLite results)                           |
| Help topic content                 | `src/commands/help/topics/*.ts` (overview, changelog, summary in `topics/meta/`)                      |
| Interaction routing & errors       | `src/services/discord/interaction/` (interactionHandler, interactionErrors, tracedInteractionHandler) |
| Interaction handlers               | `src/services/discord/handlers/` (autocomplete, modals, buttons, context menus)                       |
| Fun subcommand groups              | `src/commands/fun/funSubcommands/gamesGroup.ts`, `utilityGroup.ts`                                    |
| Giveaway button logic              | `src/commands/giveaway/buttonHandler.ts`                                                              |
| Hangman stats                      | `src/commands/fun/subcommands/hangman/hangmanStats.ts`                                                |
| Quote store (slash + context menu) | `src/services/quotes/quoteStore.ts`                                                                   |
| Command usage analytics (non-game) | `src/services/analytics/commandUsageStore.ts`                                                         |
| Request context / correlation IDs  | `src/services/logging/requestContext.ts`                                                              |
| i18n                               | `src/i18n/index.ts`                                                                                   |

---

## Discord.js v14 Migration

### Key Changes from v13 to v14

**Intent System:**

- v13: `Intents.FLAGS.GUILDS`
- v14: `GatewayIntentBits.Guilds`

**Interaction Types:**

- v13: `CommandInteraction`
- v14: `ChatInputCommandInteraction`

**Message Flags:**

- v13: `ephemeral: true`
- v14: `flags: MessageFlags.Ephemeral`

**Permissions:**

- v13: `Permissions.FLAGS`
- v14: `PermissionFlagsBits`

**Builders:**

- v13: `MessageActionRow`
- v14: `ActionRowBuilder`

### Type Narrowing Best Practices

When checking guild context:

```typescript
// ✅ Good - use type assertion after check
if (!interaction.inGuild()) {
  await (interaction as ChatInputCommandInteraction).editReply("Guild only");
  return;
}
// Now TypeScript knows we're in a guild
```

When checking permission results:

```typescript
// ✅ Good - check property existence
if ("reason" in result && !result.ok) {
  await interaction.editReply(result.reason);
}
```

---

## Logging

OmegaBot uses a centralized logger for structured logs.

Guidelines:

- Use logger.info for lifecycle events
- Use logger.warn for recoverable issues
- Use logger.error inside catch blocks
- Avoid logging inside pure helpers
- Prefer logging at command boundaries and service entry points
- **Never log secrets**: Do not log `DISCORD_TOKEN`, API keys, or other env vars that contain secrets (e.g. `env.token`, `process.env.WEATHERAPI_KEY`). Log only that a feature is enabled/disabled (e.g. `weather: true`) or use redacted placeholders.

### Error handling

- **Slash commands**: The interaction handler (`services/discord/interaction/interactionHandler.ts`) wraps every `command.execute()` in try/catch, logs with context (command, userId, interactionId), and sends the user an i18n generic message (plus optional Discord error hint). Commands can still catch internally and `editReply` with a specific message before rethrowing.
- **Known Discord errors** (10062 unknown interaction, 40060 already acknowledged, 10008 unknown message) are logged at INFO via `interaction/interactionErrors.ts` so they don’t flood error level; the user may still see "interaction failed" in Discord.
- **Buttons & modals**: Handlers in `handlers/buttons.ts` and `handlers/modals.ts` catch handler errors, log with `logger.error`, then try to reply or edit with "Something went wrong…" so the user gets feedback instead of a bare "interaction failed".
- **Context menus**: Same pattern as slash commands (try/catch, known-error handling, user-facing fallback reply).

---

## Autocomplete & Interaction Handling

### Autocomplete

When adding autocomplete to a slash command option (`setAutocomplete(true)`), implement the optional `autocomplete` handler on the command module. The handler must call `interaction.respond(choices)` within ~3 seconds.

```typescript
// In your command module
export const data = new SlashCommandBuilder().addStringOption((o) =>
  o.setName("zone").setDescription("Timezone").setAutocomplete(true),
);

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused();
  const choices = getMatchingTimezones(focused).slice(0, 25);
  await interaction.respond(choices.map((z) => ({ name: z, value: z })));
}
```

If a command has no autocomplete handler, the interaction handler responds with `[]` so Discord does not show an error.

### "Interaction Failed" Prevention

Collectors and button handlers should:

1. **Defer early** – Call `deferUpdate()` or `reply()` before any heavy work (DB, file I/O, game logic).
2. **Use `message.edit()` after defer** – Once deferred, update the message via `message.edit()`, not `interaction.update()`.
3. **Catch and recover** – Wrap handlers in try/catch; on error, call `deferUpdate().catch(() => {})` if the interaction was never acked.

Logs include `interactionFailedRecovery: true` when we recover from an error to prevent "interaction failed". Use this field when monitoring or alerting on interaction issues.

---

## Environment Variables

See [.env.example](../.env.example) for the full list of required and optional
environment variables.

---

## Configuration and Feature Gating

OmegaBot uses environment variables not only for secrets, but also
to enable or disable optional features at runtime.

Design principles:

- Required variables are validated at startup and fail fast
- Optional features are gated by the presence of their related env vars
- The bot must be able to start and run safely with optional features disabled
- Feature-specific code should never assume configuration exists

Examples:

- GitHub polling is enabled only when all required GitHub env vars are present
- Auto-role assignment is enabled only when DISCORD_AUTO_ROLE_ID is set
- LLM summaries are enabled only when SUMMARY_MODE=llm and OPENAI_API_KEY is present
- Hangman word management (add/list) is available only to users with the role in HANGMAN_ADMIN_ROLE_ID

This allows:

- Safe local development without external services
- Gradual feature rollout via configuration
- Clear operational behavior without code changes

---

## Error Handling

- Commands must catch errors and reply gracefully
- Services may throw domain-specific errors
- Background tasks and pollers must never crash the process
- Unexpected errors should be logged with context

---

## TypeScript Best Practices

### Strict Type Checking

OmegaBot uses TypeScript's strict mode for better type safety:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Discord.js Type Narrowing

Always narrow interaction types before accessing specific properties:

```typescript
// Check if it's a chat command
if (interaction.isChatInputCommand()) {
  // Safe to use chat command methods
}

// Check if in guild
if (interaction.inGuild()) {
  // Safe to access guild-specific properties
}
```

---

## Testing

### Unit Tests

- Run in watch mode: `npm run test`
- Run once (CI): `npm run test:run`
- Database-backed tests should use the in-memory SQLite helper: `src/test/dbTestUtils.ts`

### Manual Testing

When testing commands:

- Test both success and error paths
- Test with missing permissions
- Test with invalid inputs
- Test DM vs guild contexts
- Test "ephemeral" vs public responses (where supported)

---

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for debugging "failed to complete" errors and other common issues.

---

## Future Improvements

- Replace remaining file stores with database
- Integration tests for collectors (button/dropdown flows) – dice, slots, ping, health integration tests exist
- ~~Discord.js version check~~ – Done: `npm run check:discord` in CI
- Reorganize `src/commands/fun/subcommands` into `games/` and `utility/` (or similar) so the folder has ≤10 direct children
