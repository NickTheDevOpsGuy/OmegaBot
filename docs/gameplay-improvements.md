# Gameplay Improvements (Playing Standpoint)

Suggestions to improve how games feel to play: clarity, fairness, discoverability, and engagement. Based on a pass through the fun commands and their UIs.

---

## Blackjack

**Current:** Hit, Stand, Extend time. Dealer stands on 17. Cooldown 5s, game timeout 1h.

- **Double down missing** – Comment in code mentions "hit/stand/double" but only Hit and Stand exist. Adding a **Double** button (one extra card, then dealer plays) would match real blackjack and add meaningful choice.
- **No Split** – Splitting pairs is optional but would deepen strategy; lower priority than Double.
- **Timeout outcome** – On timeout the message shows "Dealer wins" + "Timed out". Consider: "*You didn't play in time; round forfeited.*" so it's clear it wasn't a normal loss.
- **Blackjack payout** – Message says "You win 3:2!" but there's no currency/bet; consider "Blackjack! (3:2 payout)" or keep as-is for flavor.

---

## Wordle

**Current:** Daily word, 6 guesses, modal input, 🟩🟨⬛ feedback, letter bank, share line, resume.

- **Invalid words count as guesses** – The modal only checks length (5) and `[a-z]`. Words like `AAAAA` or `XYZAB` are accepted and consume a guess. **Validate against the word list** (e.g. `WORDS` in `gameLogic.ts` or a separate "valid guesses" list) and reply ephemerally: "Not in word list. Try another 5-letter word." without using a guess.
- **Discoverability of stats** – First-time players may not know `/fun wordle stats` exists. Optional: add a small line under the grid when the game ends: "*See your stats: `/fun wordle stats`*".
- **Resume message** – "Continuing your game..." is good; consider adding "*X guesses so far*" when resuming so they know where they left off.

---

## Slots

**Current:** One spin per command, paytable/leaderboard/stats via flags, jackpot tracking.

- **Paytable visibility** – Players only see paytable if they use `/fun slots paytable:True`. Consider **showing a short paytable in the footer** of the spin embed (e.g. "3-of-kind: 5–100× | Two match: 2×") or a "View paytable" hint so they don't need to discover the option.
- **"2x" meaning** – Paytable says "Two matching symbols: 2x". Since there's no bet, "2×" is a multiplier on… what? Consider "Two matching: **2×** (small win)" so it's clear it's a small win tier, not a bet multiplier.
- **Biggest win in stats** – Stats show "Biggest Win: X" when present; good. No change needed.

---

## Hangman

**Current:** Letter dropdowns (A–M, N–Z), difficulty, 6 wrong guesses, solve time on win.

- **Wrong letters** – "Wrong: A, B (2/6)" is clear. Consider always showing the fraction even when wrong list is empty: "Wrong: (0/6)" so lives remaining are obvious at a glance.
- **Difficulty in message** – "Difficulty: Easy" is shown; good. No change needed.

---

## Rock–Paper–Scissors

**Current:** Solo vs bot (one shot), challenge with opponent (both pick; 24h timeout).

- **Solo** – Single round, then done. Optional: add a **"Play again"** button that re-runs a round (same command, no new flow) to reduce typing `/fun rps choice:rock` again.
- **Challenge** – Both players see the same buttons; decline and extend are clear. Head-to-head stats are a nice touch. No major changes.

---

## Trivia

**Current:** One question per `/fun trivia`, 30s to answer, category/difficulty, points and streaks.

- **One question per command** – To play again you run `/fun trivia` again. Optional: after answering (correct or wrong), show a **"Next question"** button that fetches another question and updates the message (same collector or new), so players can binge without re-typing the command.
- **Timeout** – "Time's up! The answer was: X" and buttons disabled is clear. Good.

---

## Connect 4 (PvP)

**Current:** 7 columns, 🔴/🟡, turn line, 30 min per move, extend (starter only).

- **Turn line** – "Turn: 🔴 @user1" is clear. Good.
- **Column labels** – "1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣" under the board matches buttons 1–7. Good.
- **Full column** – Buttons are disabled when `board[0][col] !== 0`. Consider adding a small note when the last column fills: "*Game is a draw*" if you support draw detection (or already do).

---

## Tic Tac Toe

**Current:** Vs bot (❌ vs ⭕) and vs player; 3×3 grid, extend time.

- **Vs bot** – "Your turn! Click a square." is clear. Bot move is immediate after player. Good.
- **Vs player** – Same turn-indication pattern as Connect 4 would help (e.g. "Turn: ❌ @user1").

---

## Darts

**Current:** Solo = one throw (3 darts), challenge = both throw once, higher score wins.

- **Solo** – Single throw of 3 darts, then done. Optional: **"Throw again"** button for another round without re-typing the command.
- **Challenge** – Clear who threw what; H2H stats are good. No change needed.
- **Scoring** – Display of hits and total score is clear. Optional: brief rules in help (e.g. "3 darts per throw; highest score wins in PvP").

---

## Cross-cutting

- **Cooldowns** – Messages like "Wait X seconds before playing again" are clear. Consider linking to the command: "*Use `/fun slots` again in Xs.*"
- **Extend time** – Games that have "Extend time" explain it well (e.g. "+30 min for this move"). Good.
- **Ephemeral vs public** – Most games post in-channel so others can watch; Wordle has a channel tease. Consistent and good.
- **Help** – `/help topic:games` (or similar) could list each game with one line and a tip (e.g. "Wordle: invalid words don't count if you add validation").

---

## Priority summary

| Priority | Item |
|----------|------|
| High     | Wordle: validate guess against word list so invalid words don't use a guess. |
| Medium   | Blackjack: add Double button (and clarify timeout message). |
| Medium   | Slots: surface paytable in spin embed or footer so players don’t need to discover the flag. |
| Low      | Trivia: "Next question" button after each answer. |
| Low      | RPS solo / Darts solo: "Play again" or "Throw again" button. |
| Low      | Hangman: show "Wrong: (0/6)" when no wrong letters yet. |

If you want, the next step can be implementing the Wordle word validation and/or the Blackjack Double button.
