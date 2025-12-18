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

## Error Handling

- Commands must catch errors and reply gracefully
- Services may throw domain-specific errors
- Background tasks and pollers must never crash the process
- Unexpected errors should be logged with context

---

## Future Improvements

- Replace file stores with a database
- Add metrics and observability
