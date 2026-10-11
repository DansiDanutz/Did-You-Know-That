# Dexty.live v3 — knowledge points & Special Cards (plan, awaiting approval)

## Goal
Make Dexty.live a game that rewards **what you learned**, not what you watched: points come from
answering questions about each episode's subject; points unlock **Special Cards**; a Special Card opens a
**special video** made only for players (bonus mystery, behind-the-scenes, deeper dive).

## Hard rules (protect the channel and kids)
- **Never reward views or watch time** (YouTube fake-engagement policy). No points for "I watched it",
  for clicks on the player, or for comments/likes/subscribes. The current "I watched it — reveal" honour
  button stops awarding anything; cards unlock through the quiz instead.
- Local profile only (the restored old-game sign-in): no accounts, no email, no tracking, works offline.
  Kids keep generated explorer names. No public leaderboard (it was removed for safety).
- No streak pressure, no timers, no loss messages. Points never expire and cannot be bought.

## How points work
| Source | Points | Notes |
|---|---|---|
| Episode quiz — one question per era (7) + "the answer" | 10 per correct, first try only | Shuffled options; retry allowed for 0 pts so learning still counts |
| "Guess before you watch" turned out right | 25 | Locked before the quiz; checked when the quiz is completed |
| Perfect episode (all correct first try) | 50 bonus | Once per episode |
| Daily "Did you know that…?" question | 5 | One per day from published episodes' facts; skipping costs nothing |
| Collecting all fact cards of an episode | 20 | Fact cards unlock from that era's correct answer |
Episode 01 maximum ≈ 155 pts. All awards go through one **idempotent ledger** (event id = what + where),
so refreshing or replaying never double-counts.

## Special Cards
- Catalogue in `website/data/special-cards.json`: id, title, art, cost (pts) and/or condition
  (e.g. "perfect Episode 01"), and the special video (YouTube **unlisted** id) or an on-site page.
- **Card Vault** page: locked silhouettes with cost/condition → "Unlock" spends points → neon reveal
  animation (reduced-motion safe) → the card opens the special video (click-to-play facade, nothing
  loads from YouTube before play).
- Honest limitation: unlisted links and browser-stored points are a soft lock (anyone determined can find
  them). Fine for a free game; if real exclusivity is ever needed, that means YouTube channel memberships
  or a server — not in v3.
- First set (needs videos produced): 3 cards, e.g. "The Watch That Crossed the Atlantic" (Harrison H4),
  "The Night People Slept Twice", "Keynes's Missing Hours".

## Build phases
1. **Quiz engine + ledger** — `quiz` per episode in `episodes.json` (questions sourced from the episode's
   RESEARCH facts), points wallet in the header and profile sheet, migrate existing guesses/cards.
2. **Card Vault + Special Cards** — catalogue, unlock flow, reveal, special-video facade, share link.
3. **Daily question** — deterministic "question of the day" from published facts.
4. *(Optional, later)* notifications — needs a backend (web push) and its own privacy review.

## Quality gates
Unit tests for the ledger (idempotency, no double awards, no award paths from watching), quiz scoring,
unlock spending and data validation (every Special Card points at a real asset); browser checks at
320–1920 px, keyboard and screen reader; `build-site --check`; branch → screenshots → David approves →
PR → merge → manual `vercel --prod` → live verification.

## Decisions for David
1. Point values and Special Card costs above — OK or adjust?
2. Which special videos to make first (they are produced like episodes, narrated by Brian)?
3. Remove the "I watched it" unlock now (recommended) — yes?
4. Daily question in v3, or later?
