# Development Notes

This document captures design decisions, conventions, and architectural guidelines for OmegaBot.

---

## Architecture Principles

- Commands are thin and delegate logic to services
- Services are grouped by domain (discord, github, transcript, summary, timezone)
- Helpers are pure where possible
- Side effects (network, fs, Discord I/O) are explicit

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

- Replace file stores with a database
- Add metrics and observability
- Implement comprehensive integration tests
- Add automated Discord.js version compatibility checks
