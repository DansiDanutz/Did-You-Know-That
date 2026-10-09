# Audit reconciliation — Codex audit of 9 Oct 2026 (baseline `c334e34`)

Re-checked against `main` at `f05135b` (PR #2 merged) on 9 Oct 2026.
Status: **fixed** (code + evidence), **partly fixed**, **open**, or **changed scope** (the master plan redefines the requirement).

| # | Finding | Status | Evidence on `f05135b` | Remaining work (phase) |
|---|---|---|---|---|
| 01 | Book handlers survive reopening | **fixed** | `website/js/ui/book.js`: all container/window/media listeners take one `AbortController` signal; `destroy()` aborts it (`569c9ae`). Browser check on preview: 3 fast open/close cycles, then one spark tap → `✦ 0/12 → 1/12`. | Add an automated browser regression for reopen + repeated claim (B). |
| 02 | Leaderboard identity and achievements unauthenticated | **changed scope: retired from journey (B)** | `website/api/_leaderboard.js` still trusts client-reported cards and `playerId`. | Master plan §14: hide/retire the board from the core journey, keep existing records, no competitive knowledge claims (B). |
| 03 | Chinese lost after reload | **fixed** | `website/js/lib/storage.js` derives `LANG_CODES` from the language catalog; test "every language the picker offers survives a reload" (`tests/i18n.test.mjs`). Browser: `zh` restored after reload (`lang=zh`, start button 开始冒险). | — |
| 04 | Reopening an inventory book can destroy the new book | **fixed** | `website/js/app.js`: `closeBook` stores its teardown in `pendingClose`; `openBook` calls `finishPendingClose()` first; teardown only clears globals when they still point at the closed book. | Browser regression for inventory → read while a book is open (B). |
| 05 | Dialog / hidden-page accessibility | **fixed (B)** — modal focus/inert + text-size toggle; keyboard-only + screen-reader journey still untested | Inactive faces get `inert` + `aria-hidden` on every refresh (`book.js`); browser: 1 of 18 faces reachable. | Modal focus trap + restore, background inertness for book/panels/player, ~12 px story text at 320×568 (B). |
| 06 | Daily video promise vs enforcement | **changed scope (B)** — rarity ladder retired; daily limit on new videos kept pending decision 3 | Replays are free; the daily count is effectively "new cards per day"; rarity still depends on the order of the day (`js/lib/daily-limit.js`). | Plan §4: remove viewing-order rarity and the "videos per day" promise; migrate old rarities (B). |
| 07 | Render failures hidden, tool drift | **fixed, not yet exercised** | `tools/render-ep01-kids.sh` (`0b9f1f0`): `set -euo pipefail`, logs instead of `| grep … \|\| true`, pinned `hyperframes@0.8.143`, per-run temp files, master replaced only after the ≤300 s check. `render-neon-cards.sh` pinned too. | First full run of the new script (C). |
| 08 | Published video journey not ready | **open** | All `youtubeId` values blank; no adults master; Ep 2 short; Ep 3–4 coming soon. | Pilots (C), publication checklist (D) — publishing needs David's approval. |
| 09 | Spec and checklist disagree with implementation | **partly fixed** | Series Bible now states learning-first rules (`0b9f1f0`); this phase rewrites Bible, README and NEXT-STEPS to the master plan. | Keep docs in sync per phase. |
| 10 | Tests don't cover the deployed journey | **partly fixed** | `.github/workflows/tests.yml`: syntax check + 150 unit tests, passing on PR #2 (Node 22). | Browser journey tests (B). |
| 11 | Offline and narration maintenance | **fixed (B)** — versioned shell precache, honest offline failures, narration fingerprints | `website/sw.js` precaches 5 files; narration generator skips existing files regardless of text changes. | Versioned app-shell precache, honest offline states; narration text/voice/settings hashes (B). |
| 12 | Progress recovery and child-name isolation | **fixed for the journey (B)** — backup/restore; leaderboard (the only place names appear) retired | Kids form only shows generated names (`isKidNickname`); still one profile across audiences, no server enforcement, no backup. | Separate audience identities if the board survives; backup/export/import (B). |

## Fixes made after the audit (not in the audit)
- Magic word accepts punctuation/emoji/case and either audience's word (`js/lib/secret.js`, tests in `tests/lib.test.mjs`).
- Every book page is read aloud as it turns (`reading = true`).
- Character renamed **Dexter** in all visible/spoken places (David, 9 Oct 2026). The master plan says "Daxter"; David's later direct instruction wins.

---

# Follow-up audit (product/learning, 9 Oct 2026) — stage 1 "trust and correctness"

Branch `fix/audit-stage1`. Evidence from unit tests and browser checks on a preview (not yet live: production deploy needs David's approval).

| Finding | Status | Evidence |
|---|---|---|
| Two tabs overwrite each other's saves | **fixed** | `store.updateCollection/updateLearning` apply each change to the latest stored data under a Web Locks cross-tab lock (`js/lib/storage-lock.js`); open tabs refresh on the `storage` event. Test "two tabs saving different cards keep both"; browser: episode page in tab 2 saved honey, app tab (stale) saved Ep 1 → both kept, app counter had already synced to 1/4. |
| Failed writes still show "Saved" | **fixed** | Writes return `persisted`; app shows "cards last for this visit only…", episode page keeps the Save button and explains. Tests + browser with `setItem` throwing. |
| Corrupt learning record discards cards | **fixed** | Records read separately; test "a corrupt learning record does not discard saved cards"; migration no longer overwrites learning another tab wrote. |
| Expanded card Share has no handler; no close; not a modal | **fixed** | `card-inspect.js`: Share wired, ✕ close, background inert, focus in and restored. Browser: focus inside, library inert, Share → canonical `/e/<slug>/` link (copy fallback shown where share/clipboard are unavailable). |
| Player: unbounded API load, stale mount, no fallback | **fixed (untested with a real video)** | 10 s timeout, no player attached after close, Retry + Open in YouTube on load/embed error. No published video exists to exercise it. |
| Saving opens the video automatically | **fixed** | Save only saves; the card page shows ▶ Watch when a video exists. Browser: listen layer stays closed after save. |
| Leaderboard write route still live | **fixed in code, not deployed** | `api/score.js` → HTTP 410 "retired", nothing stored, old records untouched; test added. |
| Leaderboard wording in metadata | **fixed** | `index.html` description and `manifest.webmanifest`. |
| iOS "Done" marks the app installed | **fixed** | Button now "Got it" and only hides the steps; installed state comes from standalone mode / install events. |
| "Teens & Adults · harder questions" | **fixed** | "History, science and everyday discoveries" in 7 languages. |
| Draft shown as "Today's discovery" | **fixed** | Unreleased episode labelled "Coming next · read it now". |
| Discovery page → app loses audience/story | **fixed** | Link `/?audience=…&story=…`; app opens in that audience and opens the story after Start. |
| Generic social preview image, placeholder sources | **open** | Needs episode artwork and the finished claim ledgers (Phase C). |
| Stale docs saying "preview only" | **fixed** | `docs/ACCEPTANCE.md` updated: Phase A/B live since 9 Oct 2026 (`1146cb5`). |
| Stage 2–5 (video pilots, missions, parent corner, adoption, pilot study) | **open** | Not started; see the audit handoff. |

## Story/business brief review of stage 1 (9 Oct 2026)

| Concern raised | Status | Evidence |
|---|---|---|
| Web Locks fallback just runs the work | **verified + documented** | With Web Locks (all current major browsers, Safari since 15.4): browser test with two tabs starting in the same millisecond, 40 saves each → 80/80 kept. Without Web Locks: a single tab is safe; two tabs writing in the same instant could still collide (documented limit, `tests/storage-lock.test.mjs`). |
| Expanded-card manual inert vs modal manager | **fixed** | The card overlay now lives in `#inspect-layer`, registered with `modal-focus.js`; browser: focus inside while open, library + top bar inert, focus returns to the card on close. |
| Hidden journey map exposed in adult mode | **fixed** | `body.is-adults` hides the map, kids bar and walk controls from sight, keyboard and screen readers; browser: 0 map controls reachable. |

---

# Kimi audit of 9 Oct 2026 (`~/dexty-audit-2026-10-09.md`, clone at `6f65112`)

Re-checked on 9 Oct 2026 against live dexty.live (= `main` `0ceb203`) and branch `fix/kimi-audit` (stacked on PR #9 → #8 → `main`).
**Live** = served by dexty.live now. **Local** = committed on `fix/kimi-audit`, tested, not deployed. Nothing here was deployed to production.

| Finding (Kimi §) | Evidence checked | Status | Action |
|---|---|---|---|
| Live CSS not reproducible from `main` (§2.4) | `shasum` of live vs `main`: `css/base.css`, `js/app.js`, `index.html`, `precache.js` identical; flicker fix is `1b68184` on `main` | **already fixed (live)** | — |
| Score writes unauthenticated (§6.4) | `POST /api/score` → 410 live | **already fixed (live)** | — |
| Leaderboard reads still served (§6.4) | `GET /api/leaderboard` → 200 live, served stored nicknames | **fixed (local)** | Route returns 410; test in `tests/api.test.mjs`; records untouched |
| 112 stale narration clips (§2.2) | `make-narration.mjs --check`: 0 stale | **already fixed (live)** | Ep 2 narration was never recorded (364 clips, ≈59.6k characters): budget item |
| `ADULT_STREAK_BONUS` pays per extra video (§6.3) | `js/lib/points.js` | **fixed (local)** | Removed; legacy `slot` ignored; test updated |
| D1 Firefox mask covers the gate card | `base.css` had only `-webkit-mask` + `mask-composite` | **fixed (local), not verified in Firefox** | Standard `mask` added; computed `mask-composite: exclude` in Chromium; no Firefox on this Mac |
| D2 Start below the fold at 375×667 / 844×390 | Reproduced and **worse** after the name field: button at 727–788 px of 667 | **fixed (local)** | Sticky Start on short screens + `scroll-padding-bottom`; verified 375×667 (button 570–631, focused name field clear of it) and 844×390 |
| D3 wrong-answer contrast | `.choice.is-wrong { opacity: .75 }` | **fixed (local)** | Opacity removed, tint kept |
| D4 gold focus ring on parchment | `base.css` focus rule | **fixed (local)** | Dark ring inside `.book` |
| D5 "climb the leaderboard" in metadata | `index.html`, `manifest.webmanifest` on `main` | **already fixed (live)** | — |
| D6 `--ink` defined twice | `base.css` vs `episode.css` | **fixed (local)** | Episode pages use `--text` |
| D7 raw `inv.points` key | Only the dev showcase passed points | **fixed (local)** | Points badges removed (retired concept); new test fails on any `t("key")` missing from English |
| D8 touch targets 36/40 px | `.chip`, `.kids-bar` buttons | **fixed (local)** | 44 px |
| Obsolete leaderboard copy/code | `js/api.js`, `openLeaderboard`, 19 `lb.*`/`hud.leaderboard`/`reveal.points` strings ×7 | **fixed (local)** | Removed |
| No privacy policy / parent surface (§6.4, §7.4) | none existed | **fixed (local), contact missing** | `/parents/`: age fit, sourcing, YouTube behaviour, on-device data, every outside request, name recordings, backup/delete, stopping, family activity. No owner/contact invented: flagged on the page. Not a legal review |
| Quiz "mastery stars" (§4.2, §7.2) | — | **corrected** | No mastery claims: library shows "Saved" and "Tried Hoot's questions" (no score); missions show "Tried" / "Solved on your own" (tested) |
| Coin shop / cosmetic currency (§4.2) | Brief: direct rewards, no shop or currency in the pilot | **rejected** | Mission rewards stay direct (PR #8) |
| Find-of-the-day, Friday releases (§7.1) | Brief: no daily-release promise; spotlights labelled | **corrected** | "Today's discovery" → "Latest discovery" (×7); archive linked as "editor's pick" |
| Weekly recap "This week Alex collected…" (§7.4) | Puts a child's name in shareable material | **corrected, deferred** | Any recap must describe activity only, never the name |
| Parent PIN stats, og:image renders, album completion | — | **deferred** | After the pilots |
| Golden Minutes conflicts (brief) | Old script: GOLDEN seal, leaderboard pitch, four subjects | **fixed in docs (local); app copy open** | Old script marked superseded; replacement "The Re-Reading Trap" is the archive pilot. The in-app adult book still has the magic-word bonus line and unverified Franklin figures: changing it makes 7 languages of narration stale (paid re-record) |
| Adults identity split (§5.3) | — | **partly done (local)** | `/archive/re-reading-trap/`: documentary register, Measured / Interpretation / Limit tags, page citations, DOIs checked with Crossref, prediction with reasoned feedback, free save + private takeaway (tested) |
| Ep 1 kids "3 videos a day" copy (§4.3) | `en.js` story + quiz question; daily limit still enforced | **open: decision 3** | Text change makes kids narration stale ×7 (paid) |
| Ep 1 kids magic word | Video-only word gives a "surprise" | **open: decision 4** | Brief says never reward video-only answers; recommend removing the surprise or the seal |
| "Ages 6–12" vs Bible "7–9 first" | App labels 6–12 | **open: your call** | Parent page states both |
| Google Fonts request on every load | `index.html`, episode pages | **new finding, disclosed** | Self-hosting needs a font-file decision (repo is public) |
