# KIDS · Episode NNN · "<Title>"

Copy to `episodes/kids-NNN-<slug>/README.md`. One production folder per episode: this file + `claims.md`, `storyboard.md`, `narration.json`, `rights.md`, `captions.en.vtt`, `card.json`, `thumbnails/`, `qa-receipt.md`, `publication.md`.

Audience: ages 7–9 (wider 6–12 only after testing). Length: target 3–4 min, hard ceiling 5:00. Narrator: Dexter, first person, talking to the viewer.

## 1. Brief
- **The question (0–8 s):** one visual problem a child can see and ask about.
- **Why it matters to a kid:**
- **What they will understand at the end (one sentence):**
- **Words to explain in context:**
- **Real-world mission (final 15–25 s):** a safe offline or family activity, with a clear finish.
- **What we must not do:** shame bodies/phones/food/money/families; scare; say all phone use is bad; assume one family structure.
- **Recurring cast used:** Dexter (+ Professor Hoot / episode friend).
- **Not in this episode (from Ep 2 on):** app tutorial, compulsory 7 s intro, mid-video magic-word card. One optional app mention near the end at most.

## 2. Beat sheet (seconds)
| Beat | Window | What happens on screen | Dexter does (action, not just talk) |
|---|---|---|---|
| Problem | 0–8 | | |
| Mission | 8–25 | | |
| First discovery + joke/prediction | 25–75 | | |
| Complication: a plausible wrong idea, tested kindly | 75–135 | | |
| Payoff: discovery solves the problem | 135–195 | | |
| Recap + real-world mission + goodbye | final 15–25 | | |

## 3. Claim ledger → `claims.md`
| # | Exact claim (as said) | Source (title, URL, date) | Supporting passage / location | Population / place | Numbers + units | Uncertainty | Script time | On-screen treatment | Checked on |
|---|---|---|---|---|---|---|---|---|---|

Health claims: two independent reliable sources or one authoritative primary source with the reason; re-checked before publication; David approves the packet.

## 4. Script
Plain text per scene, timed later from the real recorded narration (never guessed).

## 5. Storyboard → `storyboard.md` (one row per shot)
| Shot | Start–end | Narration | Focal subject | Animation / action | Camera (and why) | On-screen words | Asset + licence | Sound | Claim ref |
|---|---|---|---|---|---|---|---|---|---|

Rules: one focal point; Dexter visibly acts (anticipates, looks, gestures, reacts, handles props); mouth moves only while speaking; animate the explanation itself; no constant zooms, flashing, frantic cuts or decorative particles; hold diagrams long enough to read.

## 6. Narration manifest → `narration.json`
`[{ id, text, voice, model, settings, sha256(text+voice+model+settings), file, seconds }]` — unchanged lines are never regenerated.

## 7. Card → `card.json`
`cardId`, `audience: "kids"`, `episodeId`, `title`, `art`, `summary` (one sentence), `topic`, `sources[]`, `slug`. Saved freely; no quiz or playback required.

## 8. Thumbnails and titles
Two honest options, each readable at phone size, one accurate curiosity gap, no fake before/after.

## 9. QA receipt → `qa-receipt.md`
- [ ] Watched the full master with sound (who, when)
- [ ] Beginning, middle, reveal, ending and every scene boundary inspected
- [ ] Lips move only with speech; timing matches narration
- [ ] No missing media, clipping, occlusion, misspelling; text inside safe areas
- [ ] Duration ≤ 5:00 (measured): ___ s · 1920×1080 · 30 fps · H.264/AAC
- [ ] Loudness measured on the encoded master: ___ LUFS integrated, ___ dBTP (house target −14 / ≤ −1.5)
- [ ] Every claim in the ledger matches the script; captions match narration
- [ ] Closing scene makes no fake clickable end-screen elements (made-for-kids)

## 10. Publication draft → `publication.md`
Title, description with sources, audience = **Made for kids**, captions file, playlist, no automatic scheduling. Publishing requires David's approval.
