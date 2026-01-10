# Development Notes

This document captures design decisions, conventions, and architectural guidelines for OmegaBot.

---

## Architecture Principles

- Commands are thin and delegate logic to services
- Services are grouped by domain (discord, github, transcript, summary, timezone)
- Helpers are pure where possible
- Side effects (network, fs, Discord I/O) are explicit

---

## Logging

OmegaBot uses a centralized logger for structured logs.

Guidelines:

- Use logger.info for lifecycle events
- Use logger.warn for recoverable issues
- Use logger.error inside catch blocks
- Avoid logging inside pure helpers
- Prefer logging at command boundaries and service entry points

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

## Future Improvements

- Replace file stores with a database
- Add metrics and observability
