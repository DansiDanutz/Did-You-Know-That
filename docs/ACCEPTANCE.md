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
| No reward-conditioned viewing language in the **rules** | Series Bible | grep for magic-word-unlocks / answers-only-in-video | None in docs; app wording changed with the mechanics in Phase B (ladder, points, "Find out in the video" removed) | done |
| Explicit open decisions | `docs/OPEN-DECISIONS.md` | 10 decisions with recommendation | Waiting for David | decision |

## Phase B — companion flow (live on dexty.live since 9 Oct 2026, merge 1146cb5)

| Requirement | Artifact | Check | Observed result | Status |
|---|---|---|---|---|
| Versioned episode data + validation | `js/lib/episode-schema.js`, `stories.js` `publication` | `tests/episode-schema.test.mjs` | 5 tests pass; all 4 entries valid, drafts have no playable id | done |
| Base card saved freely (no playback/quiz/word) | `js/lib/collection.js`, `saveDiscoveryCard` | unit tests + browser | Saved from book page with questions skipped; double tap → 1 reveal, 1 save | done |
| Legacy progress migrated, nothing lost | `migrateProgress`, `store.loadCollection` | unit test + browser (seeded old record) | Legendary card → first-season badge with original date; coins and magic word kept; old key untouched | done |
| Viewing-order rarity, points, leaderboard retired from the journey | `app.js`, `panels.js`, `index.html` | browser | No points anywhere in library; 🏆 button removed; records kept server-side | done |
| Quiz = private learning feedback | `recordQuizIfDone` → `dexty-learning-v1` | code + unit test | Never ranked, never required | done |
| Audience homes | `js/ui/home.js` | browser 390 px | Adults: Today's Discovery + topics, no map; kids: map + "Dexter's adventure" bar with Read (Watch only when published) | done |
| Public discovery pages with server-visible metadata | `tools/episode-pages.mjs` → `e/<slug>/index.html` | `tests/episode-pages.test.mjs`; browser | 4 pages; title/og:* in static HTML; drafts show "Coming soon", no iframe; save works on the page | done (crawler fetch of a live URL: **open**, previews are login-protected) |
| Share + copy fallback | `shareDiscovery`, `episode-page.js` | code review | Web Share → clipboard → visible URL fallback | done (real-device share sheet **untested**) |
| Collection search / topic filter / empty states | `panels.js` `openInventory` | browser | Tools appear from 2 saved cards; empty + no-match messages | done |
| Backup export/import with validation | `makeBackup`/`parseBackup`, Settings | unit tests | Round trip; malformed, foreign-app, oversize refused; unknown ids dropped and counted | done (file picker on iPhone **untested**) |
| Listener lifecycle, close/open race | `book.js`, `app.js` | browser (from Phase A) | 1 tap = 1 action after fast reopen | done |
| Modal focus + background inert | `js/ui/modal-focus.js` | browser | Focus moves into book, panel and reveal; map/HUD inert while open | done (full keyboard-only journey and screen reader **untested**) |
| Readable small-screen text | "Aa" toggle in book | browser 320×568 | 13.5 px → 19 px with page scrolling | done |
| Responsive widths | — | browser 320, 390, 768, 1024, 1440 | No horizontal overflow | done (landscape phone, 200 % zoom **untested**) |
| Offline shell | `tools/precache.mjs` → `precache.js`, `sw.js` | CI `build-pages --check` | 61 files precached per version; scripts never get HTML fallback; audio/API not cached | done (real offline reload **untested**) |
| Stale narration detection | `narrationFingerprint`, manifest `fingerprints`, `make-narration --check` | unit tests | 476 baselined; 112 now stale after wording changes → silent until re-recorded | done; re-recording **blocked: budget** |
| CI | `.github/workflows/tests.yml` | GitHub | syntax + pages check + 170 tests | done |
| Published-video journey (watch → save → reopen) | — | — | No episode is published yet | **blocked: publication** |
## Phase C — pilots (in progress)

| Requirement | Artifact | Check | Observed result | Status |
|---|---|---|---|---|
| Kids Ep 1 claim ledger with opened sources | `episodes/kids-001-scroll-monster/claims.md` | Every citation opened this session; unopenable sources listed and not used | 10 claims: 5 verified, 4 need rewording (outdated 2020 figures, "scientists", bedtime = association, WHO band 2–4), 1 hyperbole; AAP "2–5, 1 h" unverified (403) | done — **human review pending** |
| Adults Ep 1 claim ledger | `episodes/adults-001-golden-minutes/claims.md` | Same rules | 11 claims: 3 verified, 7 need rewording (200,000-lifetimes figure has no published method; slot-machine line misattributed; Franklin not "untouched"; FSI now 690 h), 1 remove | done — **human review pending** |
| Kids pilot script + storyboard (rev 3, story-first) | `episodes/kids-001-scroll-monster/{README,script,storyboard}.md` | Brief's kids pattern: problem → prediction → wrong guess → hint → investigation → application → resolution; claims referenced; no reward/end-screen beats | "Who Keeps Pressing Play?": 7 lines, 23 shots, ≈3:20 est. | done (draft) — narration **blocked: approval (~2,300 chars)** |
| Adult pilot as ONE story (rev 3) | `episodes/adults-001-golden-minutes/{claims-retrieval,script,storyboard}.md` | Single researched story; adult pattern; every line → R-claim; charts carry sample/delay/source | "The Re-Reading Trap": 27-claim ledger from the full paper + Rowland 2014; 8 lines, 16 shots, ≈3:45 est. | done (draft) — narration **blocked: approval (~3,000 chars)** |
| Two 20–30 s motion tests | — | — | Proposed: kids rev 3 shots 7–12, adults rev 3 shots 8–10 | open — needs narration + render (disk below reserve) |
| Final masters, captions, cards, thumbnails, QA receipts | — | — | — | open |
| Ep 2 storyboards | — | — | — | open |

| Strategy and cast system recorded | `docs/STRATEGY.md`, Series Bible "Cast and acting system" | Brief's business model, brand hierarchy, launch sequence, scorecard, character flaws/roles | Written | done |

## Progression pilot (addendum, 9 Oct 2026)
See `docs/PROGRESSION.md`: engine, "The Missing Shadow" mission, outfits/workshop, storage + backup — built on `feat/explorer-progression`, preview only. Child test and adult Curiosity Archive open.

## Phase D–F
Launch preparation, publishing cadence, measurement — after C; publication and production deploys need David's approval.
