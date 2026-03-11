# Games & UX Ideas

Ideas to make OmegaBot more fun, sticky, and usable without bloating commands. Pick what fits your server.

---

## Making Games More Fun & Addictive

### 1. **Achievement pop when you unlock one**
Right now achievements are only visible in `/profile` or View Achievements. **After a game ends** (win/loss), check if the user just unlocked any achievement and append a line to the reply, e.g.:
- *"🏆 You unlocked: **Natural 21!**"* (blackjack)
- *"🟩 You unlocked: **Wordle Wizard** (7-day streak)!"*

**Where:** After recording the result in blackjack, wordle, hangman, slots, darts, trivia, connect4, RPS, daily check-in. Call something like `getNewlyUnlockedAchievements(userId, db)` (compare before/after) and if non-empty, append to the embed/content.

**Impact:** High – instant gratification and reason to play again.

### 2. **Streak / “almost there” nudges**
- **Wordle:** When they lose, show *"Tomorrow’s word is a new chance – keep your streak going with `/fun wordle`!"* (only if they had a streak).
- **Daily:** When they’ve already checked in, show *"🔥 Streak: 5 days. Come back in Xh to keep it!"* (you already show streak; could add *"Best on server: 12 days"* from daily leaderboard to add light competition).
- **Trivia:** After a wrong answer, *"Streak broken. Next question could start a new one – use **Next question**!"*

**Impact:** Medium – reminds people why to return.

### 3. **Cross-game “level” or XP (optional)**
Unify daily points + game wins into a single **server level** or **XP** (e.g. daily check-in = 10 XP, win = 5–15 XP by game type). Show on `/fun stats` or `/profile`: *"Level 7 (320 XP)"* and *"Next level: 400 XP"*. Keeps people coming back for “one more game” to level up.

**Impact:** High but more work (new table, migration, level formula, where to display).

### 4. **Leaderboard visibility in-game**
After a **slots** spin or **darts** round, optionally show a one-liner: *"🎰 Slots leaderboard: 1. @A 2. @B 3. @You"* (or “You’re #4 – 2 wins behind #3”). Same for darts (best round / 180s). Use existing leaderboard data; just one line in the reply.

**Impact:** Medium – social proof and competition.

### 5. **First-win / milestone celebration**
On **first win** in a game (RPS, Connect 4, Hangman, etc.), add a short line: *"🎉 First win! Try `/fun stats` to see your progress."* You already have “first run” style hints in some places; standardize “first win” and “try stats” across games.

**Impact:** Medium – teaches stats and feels good.

### 6. **Low-friction “one more”**
You already have “Play again” / “Next question” where it fits. Ensure every **solo** game (slots, dice, blackjack, hangman, wordle when lost, darts solo) ends with a **button** or clear CTA: “Play again” or “Try `/fun <game>` again.” Reduces friction for the next session.

**Impact:** Medium – more repeat plays.

---

## Usability Improvements (Current Commands)

### 7. **`/fun stats` – “vs server” hint**
Add one line when viewing own stats: *"See how you rank: `/fun leaderboard`"* or *"Compare with server: `/fun leaderboard users`."*

### 8. **`/fun daily` – next check-in time**
You already show “next check-in in Xh”. Optionally add *"Resets at 00:00 UTC"* (or server time if you have it) so people know exactly when to return.

### 9. **Trivia – category in the question embed**
Show the chosen category (and maybe difficulty) in the trivia question embed so people know what they’re playing (e.g. "Science • Medium").

### 10. **Slots / Blackjack – paytable / rules one tap**
You have paytable in a subcommand or embed. Ensure **first-time** or “rules” is easy: e.g. a “Rules” or “Paytable” button on the main slots/blackjack message, or a short “3 same = jackpot” line under the reels.

### 11. **Autocomplete for game names**
Where it makes sense (e.g. `/fun leaderboard` “by game” or a future “challenge in game X”), add autocomplete for game names (wordle, slots, trivia, …) for faster input.

### 12. **Consistent “private” default**
Document (or standardize) which commands default to ephemeral (e.g. stats, daily, profile) so users know what’s visible to the channel.

---

## New Slash Commands (Only If High Value)

Your `improvements.md` says to prefer subcommands over new top-level commands. So:

- **No new top-level command** for “challenges” or “quests” unless you really want a dedicated feature. Prefer:
  - **`/fun challenge`** – e.g. “Challenge @user to [wordle / RPS / darts]” (you have PvP for some; could unify under one subcommand with a “game” option).
  - **`/fun quest`** or **`/fun goals`** – “Today’s goal: Win 1 game of Hangman. Reward: 5 bonus daily points.” (Needs goals table + cron or daily reset.)

- **`/info time`** – you have it; ensure it’s documented and uses profile timezone.

- **Optional:** **`/fun streak`** – single place to see “your streaks” (Wordle, Daily, Trivia) in one embed. Avoids jumping between stats.

---

## Suggested Order (If Implementing)

1. **Achievement pop on unlock** (after game end) – big feel-good, reuses existing achievement system.
2. **First-win + “try /fun stats”** line on first win in each game – easy, teaches features.
3. **One line in `/fun stats`**: “See ranking: `/fun leaderboard`”.
4. **Trivia: show category (and difficulty) in the question embed.**
5. **Slots/Darts: one-line leaderboard teaser** in the result (e.g. “You’re #3 this week”).

Then, if you want more stickiness: **cross-game XP/level** (design carefully so it doesn’t overwhelm).

---

*You can implement these incrementally; start with achievement pop and first-win hints for maximum impact with minimal new surface area.*
