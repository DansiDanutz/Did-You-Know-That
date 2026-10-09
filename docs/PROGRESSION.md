# Explorer progression and the first independent mission

Spec: `~/Documents/ChatGPT/Did-You-Know-That/DEXTY-CHARACTER-AND-ADULT-PROGRESSION.md` (9 Oct 2026). Branch `feat/explorer-progression` — **preview only, not deployed.**

## Built (kids)
- `js/lib/progression.js`: item definitions (2 outfits, prism lamp + golden look, sundial decoration), mission definition, explorer state. Pure and immutable.
- `js/lib/shadow.js`: straight-line shadow geometry used to check the child's answer.
- `js/ui/mission.js`: **"The Missing Shadow"** — story → prediction (each choice explained) → experiment (drag the lamp or use two sliders; make the shadow long, then short) → apply (put the shade over the blanket) → the real sky (Earth spins; never look at the Sun) → choose 1 of 2 outfits (shown in advance) + golden lamp + sundial decoration → finish with a safe family activity. English pilot.
- Storage `dexty-explorer-v1` under the cross-tab lock with honest failure messages; included in backup files (older backups still restore).
- Dexter wears the chosen outfit on the map; the backpack shows wardrobe (switch outfits), equipment and workshop.
- Entry: 🔦 Mission button on the kids bar; works with YouTube unavailable.

## Acceptance (spec) → evidence
| Criterion | Evidence | Status |
|---|---|---|
| Cards remain freely saveable | Collection code unchanged; mission writes only `dexty-explorer-v1` | done |
| Mission + reward work with YouTube unavailable | No player calls in `mission.js` / `progression.js` | done |
| Watching/liking/sharing grants nothing | No YouTube callback writes explorer state (code review) | done |
| Required equipment always loaned | `equipmentFor` + test | done |
| Repeat completion never duplicates; hints never lower reward | Tests; browser: double-tap on both outfits → only the first granted; 1 hint used → full reward | done |
| A week away harms nothing | No clock-based state; reload test | done |
| Restore preserves items, appearance, cards, mission state | Backup round-trip test | done (real-phone restore **untested**) |
| A child can explain the goal, equip an item and stop without help or guilt | Needs a real session with a child | **open** |
| Adults: evidence vs inference vs model limits | The Curiosity Archive is not built yet | **open** |

## Content
- Claim ledger: `episodes/mission-missing-shadow/claims.md` (7 verified, 4 needs care, 1 unverified). Mission wording follows it: the Sun *seems* to move because Earth spins; no noon/clock-time claims; sundial is a decoration; no "made of darkness" research claim.
- Art is a functional pilot (simple tree/lamp vectors); a proper art pass is needed before release.

## Not built yet
Adult "Curiosity Archive" (case file, lab, systems investigation, Knowledge Atlas), more missions (water pack, magnifying lens), translations of the mission (pilot is English), parent corner.
