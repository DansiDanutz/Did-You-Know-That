# Did You Know That? · Series Bible

Video first, collection second. The product is a recognizable YouTube discovery series; **dexty.live** is its companion: discover episodes, watch voluntarily, save knowledge cards, revisit them and share discovery pages. Source of truth for the full plan: `CLAUDE-DEXTY-MASTER-PLAN.md` (9 Oct 2026). Episode templates: `episodes/templates/`.

One brand, two distinct audiences:
- **Kids** — "Explore the world with Dexter." An ongoing original cartoon series about understanding the world: phones and digital life, bodies and feelings, family and friendships, animals, nature, everyday science. Ages 7–9 first (6–12 only after testing).
- **Adults** — "Discover something surprising. Understand the story behind it." Daily explanations from history, science, nature, technology, health, finance, everyday life. Never promise the viewer has never heard it.

## Non-negotiable rules (YouTube policy and trust)
- **Never reward watching.** No card, points, unlock or perk for playback, watch time, a word only obtainable in a video, likes, subscriptions or shares (YouTube API Developer Policies III.F.3). Every card is saved freely; the same learning is on an accessible discovery page; quizzes are optional private feedback.
- **Official playback only**: visible YouTube player with normal controls and an "Open in YouTube" fallback. Opening a video never requires an account, a quiz or saving a card. No autoplay, no hidden playback, no claims that an embedded play counts as a view.
- **Made-for-kids videos** have no working cards/end-screen elements/comments: closing scenes may be branded but never pretend to be clickable. Directions are spoken/text and truthful.
- **Engagement means** curiosity, emotional connection, understanding, satisfying progress and voluntary return. No guilt, fear of missing out, punitive streaks, countdowns, randomized rewards, infinite scroll, autoplay of the next video, or rarity based on how many videos were watched.
- Every episode resolves its own headline question. A next-episode preview may pose a new question after the resolution, never withhold the answer.

## Format
- **Kids:** target 3–4 min, ceiling 5:00. **Adults:** 3–5 min, the shortest that fully explains the idea. (Editorial targets to test, not retention guarantees.)
- **Episode 1 (both audiences)** introduces Dexter, the promise and the companion app inside a complete useful story.
- **From Episode 2:** open immediately with the subject; no app tutorial; branding short and integrated; at most one brief optional app mention near the end. The 7 s intro sting and the 8 s neon magic-word card are optional assets, not mandatory beats.
- Beat sheets: see `episodes/templates/kids-episode.md` and `adults-episode.md`.
- English is the pilot production language. Interface locales (7) do not mean dubbed videos exist; label video/narration languages accurately.

## Dexter (name fixed by David, 9 Oct 2026: **Dexter**, never Daxter)
- Same name, silhouette and personality everywhere: lightbulb head with question-mark filament, round glasses, purple coat, pink-orange scarf, backpack. Smart, curious, kind, a little funny.
- Kids: Dexter narrates in the first person, talks to the viewer, and **visibly acts** — anticipates, looks, gestures, reacts, handles props, pauses for discoveries. Never an idle loop. Mouth moves only while he speaks; where exact lip sync isn't possible he turns away or the explanation takes the frame.
- Adults: a confident, curious host — mature illustration or a small recognizable guide. Do not import the kids' game layout into adult episodes.

## Kids style
Original stylized 2D/2.5D cartoon: coherent palette, round shapes, readable staging, one focal point per shot, camera moves with a reason. Animate the explanation itself (a circuit closing, a bee's dance mapping to flowers, a shadow moving). Explain unfamiliar words in context; no baby talk. Varied families and inclusive characters; model asking a trusted adult for help; respect boundaries. Never shame bodies, phones, food, money or family circumstances; don't depict all phone use as bad. End with a recap, a safe real-world mission and a clear goodbye.

## Adults style
Premium documentary explainer: restrained colour, strong typography, original diagrams, accurate charts (units, timeframe, source on screen), archival material only with rights checked, reconstructions labelled. Explain mechanisms and uncertainty; separate association from causation; no fake authority, unsupported superlatives or sensational certainty. Health and finance teach general concepts only.

## Cast
| Character | Role | Look | Voice |
|---|---|---|---|
| **Dexter** | Guide and kids narrator; adult host | See above | ElevenLabs Brian |
| **Professor Hoot** | Owl who asks the optional knowledge questions | Wise owl, tiny spectacles, scholar's cape | Warm, slow, a little theatrical |
| **Episode friend / problem** (kids) | The problem as a goofy character (e.g. the Scroll Monster, the bell creature) | Funny, never truly scary | Comedic |

## Sound
- A music bed under every section, changing with the mood; purposeful foley for what we explain; whooshes only where they mean something.
- Voice always intelligible on phone speakers; music ducked under narration; consistent levels.
- House delivery target (not a platform rule): about −14 LUFS integrated, ≤ −1.5 dBTP, measured on the final encoded master — and listened to.
- Only project-generated (`tools/make_audio.py`) or licensed audio. No copyrighted music.

## Research and production
- Topic candidates are hypotheses until researched. Every central claim goes into the episode's claim ledger with an opened, checked source.
- Production order per episode: **brief → claim ledger → script → recorded narration → storyboard (timed from the real narration) → motion test → render → QA receipt → publication draft.** Book/discovery page text is written from the same ledger.
- Never regenerate unchanged recordings; narration manifests carry text/voice/settings hashes.
- Publishing, production deployment and paid generation require David's approval.
