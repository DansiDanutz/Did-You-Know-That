# Audit reconciliation — Codex audit of 9 Oct 2026 (baseline `c334e34`)

Re-checked against `main` at `f05135b` (PR #2 merged) on 9 Oct 2026.
Status: **fixed** (code + evidence), **partly fixed**, **open**, or **changed scope** (the master plan redefines the requirement).

| # | Finding | Status | Evidence on `f05135b` | Remaining work (phase) |
|---|---|---|---|---|
| 01 | Book handlers survive reopening | **fixed** | `website/js/ui/book.js`: all container/window/media listeners take one `AbortController` signal; `destroy()` aborts it (`569c9ae`). Browser check on preview: 3 fast open/close cycles, then one spark tap → `✦ 0/12 → 1/12`. | Add an automated browser regression for reopen + repeated claim (B). |
| 02 | Leaderboard identity and achievements unauthenticated | **open → changed scope** | `website/api/_leaderboard.js` still trusts client-reported cards and `playerId`. | Master plan §14: hide/retire the board from the core journey, keep existing records, no competitive knowledge claims (B). |
| 03 | Chinese lost after reload | **fixed** | `website/js/lib/storage.js` derives `LANG_CODES` from the language catalog; test "every language the picker offers survives a reload" (`tests/i18n.test.mjs`). Browser: `zh` restored after reload (`lang=zh`, start button 开始冒险). | — |
| 04 | Reopening an inventory book can destroy the new book | **fixed** | `website/js/app.js`: `closeBook` stores its teardown in `pendingClose`; `openBook` calls `finishPendingClose()` first; teardown only clears globals when they still point at the closed book. | Browser regression for inventory → read while a book is open (B). |
| 05 | Dialog / hidden-page accessibility | **partly fixed** | Inactive faces get `inert` + `aria-hidden` on every refresh (`book.js`); browser: 1 of 18 faces reachable. | Modal focus trap + restore, background inertness for book/panels/player, ~12 px story text at 320×568 (B). |
| 06 | Daily video promise vs enforcement | **changed scope** | Replays are free; the daily count is effectively "new cards per day"; rarity still depends on the order of the day (`js/lib/daily-limit.js`). | Plan §4: remove viewing-order rarity and the "videos per day" promise; migrate old rarities (B). |
| 07 | Render failures hidden, tool drift | **fixed, not yet exercised** | `tools/render-ep01-kids.sh` (`0b9f1f0`): `set -euo pipefail`, logs instead of `| grep … \|\| true`, pinned `hyperframes@0.8.143`, per-run temp files, master replaced only after the ≤300 s check. `render-neon-cards.sh` pinned too. | First full run of the new script (C). |
| 08 | Published video journey not ready | **open** | All `youtubeId` values blank; no adults master; Ep 2 short; Ep 3–4 coming soon. | Pilots (C), publication checklist (D) — publishing needs David's approval. |
| 09 | Spec and checklist disagree with implementation | **partly fixed** | Series Bible now states learning-first rules (`0b9f1f0`); this phase rewrites Bible, README and NEXT-STEPS to the master plan. | Keep docs in sync per phase. |
| 10 | Tests don't cover the deployed journey | **partly fixed** | `.github/workflows/tests.yml`: syntax check + 150 unit tests, passing on PR #2 (Node 22). | Browser journey tests (B). |
| 11 | Offline and narration maintenance | **open** | `website/sw.js` precaches 5 files; narration generator skips existing files regardless of text changes. | Versioned app-shell precache, honest offline states; narration text/voice/settings hashes (B). |
| 12 | Progress recovery and child-name isolation | **partly fixed** | Kids form only shows generated names (`isKidNickname`); still one profile across audiences, no server enforcement, no backup. | Separate audience identities if the board survives; backup/export/import (B). |

## Fixes made after the audit (not in the audit)
- Magic word accepts punctuation/emoji/case and either audience's word (`js/lib/secret.js`, tests in `tests/lib.test.mjs`).
- Every book page is read aloud as it turns (`reading = true`).
- Character renamed **Dexter** in all visible/spoken places (David, 9 Oct 2026). The master plan says "Daxter"; David's later direct instruction wins.
