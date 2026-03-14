# Progression

OmegaBot includes a shared XP and level system that spans several games and daily check-ins.

---

## How It Works

- XP is stored in SQLite in `user_progression`.
- Each user has one shared total across supported activities.
- Levels are derived from total XP.
- `/profile view`, the **View Profile** context menu, and `/fun stats` show your current level and progress to the next level.

---

## Current XP Sources

These are the main activities that currently award XP:

- `/fun daily`
- `/fun quest` (when a daily quest is completed and auto-claimed)
- `/fun trivia`
- `/fun wordle`
- `/fun blackjack`
- `/fun slots`
- `/fun darts`
- `/fun rps`
- `/fun connect4`

Wins, jackpots, streaks, and stronger rounds usually award more XP than losses or timeouts.

---

## Level Curve

The progression curve is intentionally simple:

- Level 1 -> 2: **100 XP**
- Each next level costs **50 XP more** than the previous one

Examples:

- Level 2 -> 3: 150 XP
- Level 3 -> 4: 200 XP
- Level 4 -> 5: 250 XP

This keeps early progress quick while still letting higher levels feel earned.

---

## User Experience

You may see progression feedback in-game, such as:

- `+XP` callouts after a round
- Level-up messages when you cross a threshold
- Progress bars in profile and stats views
- Auto-claimed quest rewards in `/fun quest`

Progression is designed to complement achievements and streaks, not replace them.

---

## Notes

- XP is additive and persists across bot restarts.
- The current system is intentionally lightweight and does not yet include quests, spendable currency, or prestige.
- Future improvements could add daily or weekly challenges on top of the same progression data.
