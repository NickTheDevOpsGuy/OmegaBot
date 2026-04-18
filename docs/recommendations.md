# OmegaBot: New Commands & Improvements

Suggestions for new slash commands and other improvements. Prioritized by impact and fit with your existing bot.

---

## New Slash Commands (Ideas)

### High value, good fit

| Command                        | Description                                                                 | Why                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`/roll` or `/fun roll`**     | Alias or subcommand for “roll XdY” (e.g. 2d6, 1d20) with optional modifier. | You have `/fun dice` with sides/count; a dedicated “roll 2d6+3” style is familiar to TTRPG/board-game users and could share dice logic. |
| **`/time` or `/info time`**    | Show current time in a user’s timezone (or server default).                 | Complements `/profile timezone`; useful for “when is the meeting?” without opening profile.                                             |
| **`/serverrules` or `/rules`** | Post or link to server rules (configurable channel or text in DB/config).   | Many servers want a single “rules” command; can be a short embed + link to #rules.                                                      |

### Medium value

| Command                                         | Description                                                    | Why                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **`/fun choose`**                               | Pick one (or N) from a list: “A, B, C” or “option1 / option2”. | Quick “bot pick for us” without a full poll; good for games or decisions.                           |
| **`/fun utility remind_list`** (already exists) | —                                                              | Consider surfacing in `/help` or a “Your reminders” line in `/profile view` so it’s discoverable.   |
| **`/config moderator-role`**                    | Add/remove a role that can use `/admin` moderation.            | You have DB-backed moderator roles; if not exposed yet, a subcommand here would complete the story. |

### Lower priority / niche

| Command                                | Description                                        | Why                                                                                             |
| -------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **`/birthday` or `/profile birthday`** | Store and optionally announce birthdays.           | Nice for community feel; requires scheduling and privacy thought.                               |
| **`/wyr`**                             | Alias for `/fun would-you-rather`                  | Shorter; only if you want a top-level shortcut.                                                 |
| **`/uptime`**                          | Bot uptime (or link to `/admin stats` for admins). | `/ping` and `/admin stats` already cover this for most users; only add if non-admins often ask. |

---

## Improvements (Existing Features)

### Gameplay (from [gameplay-improvements.md](gameplay-improvements.md))

- **Wordle:** Validate guesses against the word list so invalid words don’t consume a guess; ephemeral “Not in word list.”
- **Blackjack:** Add **Double** (and optionally **Split**); keep or refine timeout message (“round forfeited”).
- **Trivia:** Optional “Next question” button after each answer so players can chain without re-running the command.
- **RPS / Darts (solo):** Optional “Play again” / “Throw again” button for one more round without re-typing the command.
- **Slots:** Paytable already in footer; consider embeds for **paytable**, **stats**, and **leaderboard** for consistency with the spin embed.

### UX / Discoverability

- **Help:** Ensure `/help topic:games` (or similar) lists each game and one-line tip (e.g. Wordle stats, slots paytable).
- **First-run hints:** When a user finishes Wordle/Hangman/Trivia, add one line: “See your stats: `/fun wordle stats`” (or the right command).
- **Ephemeral by default:** You already use `private` on many commands; keep that pattern for any new optional “only me” outputs.

### Admin / Moderation

- **`/admin warn`** or **`/admin note`**: Log a warning or note against a user (stored in DB) without timeout/kick/ban. Useful for “three strikes” or audit trail. (Requires schema + UI.)
- **Moderation log channel:** Optional channel where timeout/kick/ban (and optionally warns) are posted for transparency.

### Integrations

- **GitHub:** You have `/gh status`, `pr`, `issue`, `issues`, `prs`. Optional: `/gh repo` for repo summary (stars, description, link) or `/gh contribute` that links to CONTRIBUTING or good first issues.
- **Status:** `/status llms` is now the combined view for ChatGPT, Claude, and Cursor. Optional next step: add richer outage summaries or direct incident links per provider.

### Docs & Ops

- **commands.md:** Keep the `/status` table aligned with all live subcommands (vercel, supabase, chatgpt, claude, cursor, llms).
- **Changelog:** When you ship a release, add a short entry to the in-repo changelog (and optionally to `/help topic:changelog`).
- **Runbook:** Add a “Common tasks” section (e.g. “Add admin user”, “Change welcome channel”, “Back up DB”) with one-line commands or links to the right doc.

### Code / Quality

- **Word list for Wordle:** Keep a single source of truth (e.g. `WORDS` in `gameLogic.ts`); use it for both the daily word and valid-guess validation.
- **Stricter typings:** Continue replacing `as`/`any` in stores and API layers where low-risk (see [improvements.md](improvements.md)).
- **Tests:** Add a test for Wordle “invalid word rejected and doesn’t use a guess” once you add validation.

---

## What to Skip (For Now)

- **Many more games** – You already have a rich set; polish and engagement (e.g. “Next question”, “Play again”) add more than new game types.
- **Currency / economy** – Would require design (earn/spend, inflation, abuse). Only add if you explicitly want a bot economy.
- **Levels / XP** – You have achievements and stats; levels add complexity; skip unless you have a clear use case.
- **Custom prefixes** – Slash commands are the interface; prefix commands add maintenance and confusion.

---

## Suggested order of work

1. **Wordle validation** – High impact, contained change.
2. **Blackjack Double** – Improves depth with one button + branch.
3. **`/fun choose`** or **`/time`** – One new command that’s easy to explain and use.
4. **Trivia “Next question”** – Increases engagement without a new command.
5. **`/rules` or `/serverrules`** – If your server would use it; can start as a simple embed + link.

If you tell me which of these you want (e.g. “Wordle validation + `/fun choose`”), I can outline or implement the code changes next.
