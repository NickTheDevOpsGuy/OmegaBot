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

---

## Environment Variables

See env.example for full list.

---

## Error Handling

- Commands catch and reply gracefully
- Services may throw domain-specific errors
- Pollers and background tasks must never crash the process

---

## Future

- Replace file stores with DB
- Add metrics
