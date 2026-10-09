# Master plan acceptance matrix

Plan: `~/Documents/ChatGPT/Did-You-Know-That/CLAUDE-DEXTY-MASTER-PLAN.md` (9 Oct 2026). Branch: `feat/master-plan`. Status: **done** (observed evidence), **open**, **blocked** (missing approval/resource), **decision** (see `OPEN-DECISIONS.md`).

## Phase A — reconcile and specify

| Requirement | Artifact | Check | Observed result | Status |
|---|---|---|---|---|
| Re-audit fixes against current code | `docs/AUDIT-RECONCILIATION.md` | Each of 12 findings re-checked on `f05135b` with file/test/browser evidence | 4 fixed, 1 fixed-not-exercised, 4 partly fixed, 3 open/changed scope | done |
| Asset + licence inventory | `docs/ASSETS.md` | Every asset folder listed with source and rights | 3 rights items need David (logo, ElevenLabs terms, Avenir) | done |
| Data contract | `docs/DATA-CONTRACT.md` | Episode, card, player-data fields, migration, backup | Written; implementation in B | done |
| Two audience story/style templates | `episodes/templates/kids-episode.md`, `adults-episode.md` | Beat sheet, claim ledger, storyboard columns, QA receipt, publication draft | Written | done |
| Series Bible, README, NEXT-STEPS updated | `episodes/SERIES-BIBLE.md`, `README.md`, `NEXT-STEPS.md` | No rule requires or rewards watching | Rewritten | done |
| No reward-conditioned viewing language in the **rules** | Series Bible | grep for magic-word-unlocks / answers-only-in-video | None in docs; **app text still has it** (ladder, "videos per day", "Find out in the video") — removed together with the mechanics in B | done (docs) / open (app → B) |
| Explicit open decisions | `docs/OPEN-DECISIONS.md` | 10 decisions with recommendation | Waiting for David | decision |

## Phase B — companion flow (not started)
Lifecycle/focus fixes, audience homes, episode pages with server-visible metadata, free card saving, collection search/filter, share + copy fallback, backup export/import, leaderboard hidden, offline shell, narration hashes, browser journey tests.

## Phase C — pilots (not started)
Ep 1 kids revision, Ep 1 adults, Ep 2 storyboards, two 20–30 s motion tests. Narration budget and font decision needed.

## Phase D–F
Launch preparation, publishing cadence, measurement — after C; publication and production deploys need David's approval.
