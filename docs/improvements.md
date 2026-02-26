# Improvement Ideas (Beyond New Commands)

Suggestions to make OmegaBot more maintainable, observable, and operator-friendly. Pick what fits your goals.

---

## CI / Quality

- ~~**CI: run tests once explicitly**~~ – Done: workflow uses `npm run test:run`.
- ~~**Pre-push: run tests**~~ – Done: `scripts/precheck.sh` runs `npm run test:run` (use `[skip-precheck]` to skip).
- **Test coverage** – Run `npm run test:coverage` occasionally or in CI; add a coverage badge or gate only if you want to enforce a minimum.
- ~~**Dependency audits**~~ – Done: CI runs `npm audit --audit-level=high` (continue-on-error so PRs don’t block on audit).

---

## Operations / Deploy

- ~~**Runbook**~~ – Done: `docs/runbook.md` (deploy, restart, DB, backup, health, security).
- ~~**Backup reminder**~~ – Done: README Operational Notes and runbook mention backing up the DB.
- ~~**Automated backup script**~~ – Done: `npm run db:backup` / `scripts/backup-db.sh`.
- ~~**Metrics / health HTTP endpoint**~~ – Done: `METRICS_PORT` enables `/health` and `/metrics` (Prometheus).
- ~~**Env summary at startup**~~ – Done: bot logs `[startup] optional features` (weather, summary, hangmanAdmin, jokeModerator, autoRole).

---

## Documentation

- ~~**FAQ for server admins**~~ – Done: `docs/faq-admins.md` (Hangman words, interaction failed, backup, optional features, health, rate limits).
- **Keep commands.md as single source** – You already list commands and timeouts there; keep it updated when behavior changes.

---

## Code / Maintenance

- ~~**Resolve TODOs**~~ – Done: FAQ services.test.ts now has title/body empty tests; TODO removed.
- **Stricter typings** – Where you use `as` or `any`, consider narrowing types or adding small interfaces to avoid regressions.
- ~~**Shared constants**~~ – Done: `src/constants.ts` centralizes game timeouts, move timeouts, and rate limit cooldowns.

---

## User / DX

- **Slash command count** – You’re happy with the current set; avoid adding commands “just because.” Prefer subcommands or options (like Hangman play/stats/words).
- ~~**Error messages**~~ – Done: missing env vars (e.g. GITHUB_TOKEN, WEATHERAPI_KEY, OPENAI_API_KEY) now suggest "Set it in .env (see .env.example)".
- ~~**Rate limits**~~ – Done: cooldown replies for hangman, blackjack, slots, dice now include “(rate limit: Xs).”

---

## Security

- ~~**Secrets**~~ – Done: runbook and dev-notes say never log tokens/API keys; log only “feature enabled” or redacted placeholders.
- **Permissions** – Commands that need Manage Server (e.g. giveaway, config) already restrict; keep new admin features behind roles or permissions.

---

## What to Skip (For Now)

- **More slash commands** – You have enough; focus on polish and operations.
- **Major new systems** – Unless you need them (e.g. full moderation queue), avoid large new features that increase maintenance.
- **UI overhaul** – Current embeds and buttons are clear; no need to change for its own sake.

**Already done:** runbook, env summary at startup, pre-push tests, CI test:run, npm audit in CI, backup reminder, FAQ for admins, TODO resolved, rate limit in cooldown replies, secrets-not-in-logs doc, automated backup script, metrics/health HTTP endpoint, actionable error messages, integration tests (dice/slots/ping/health), i18n for rate limits, health optional API reachability, command usage analytics, summary fallback, Discord.js version check. The rest can be done incrementally.
