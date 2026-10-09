# Data contract (v1)

Extends today's `website/js/data/stories.js` (`id`, `episode`, `house`, `youtubeId`, `card`, `pages`, per-audience `{ kids, adults }` values) instead of replacing it. Validation lives in one pure module (`js/lib/episode-schema.js`, Phase B) and runs in the unit tests, so a malformed entry fails CI rather than the live site.

## Episode (one per audience)

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | `1` | Required. |
| `episodeId` | string | Stable, never reused, e.g. `kids-001-scroll-monster`. |
| `storyId` | string | Existing `stories.js` id (`why-wonder`) so old progress keeps working. |
| `audience` | `"kids" \| "adults"` | Kids and adults entries never share a feed. |
| `slug` | string | URL path `/e/<slug>`; lowercase `a-z0-9-`. |
| `topic` | string | From the topic list (kids: digital-life, body-feelings, family-friends, animals, nature, everyday-science; adults: history, science, nature, technology, health, finance, everyday-life). |
| `title`, `hook`, `summary` | localized strings | `hook` is the spoiler-light question; `summary` is the accessible written explanation (same learning as the video). |
| `videoLanguage` | BCP-47 | The language actually spoken in the video (pilot: `en`). |
| `narrationLanguages` | BCP-47[] | Languages with recorded book narration. |
| `captionLanguages` | BCP-47[] | Optional; only languages with real caption files. |
| `publicationStatus` | `draft \| ready \| scheduled \| published` | Only `published` shows a Play button. |
| `publishedAt` | ISO 8601 with timezone | Required when `scheduled`/`published`. |
| `youtubeId` | string | Only when valid (`^[A-Za-z0-9_-]{11}$`) and status is `published`. |
| `durationSeconds` | number | Measured from the final master (ffprobe), never estimated. |
| `card` | object | See below. |
| `socialImage`, `transcript`, `captions` | paths | Must exist when referenced. |
| `sources` | `{ title, url, checkedAt }[]` | Opened and checked; links to the claim ledger. |
| `claimLedger`, `rightsManifest` | paths | Episode production folder files. |
| `activities` | `("read" \| "listen" \| "quiz")[]` | Optional learning activities offered. |
| `relatedEpisodeIds` | string[] | Same audience only. |
| `qaStatus` | `none \| motion-test \| master-approved` | Set only from a signed QA receipt. |

## Card (public, account-free)

`cardId` (stable, e.g. `card-ep1-why` kept), `audience`, `episodeId`, `title`, `art` (original artwork id), `summary` (one-sentence knowledge), `topic`, `publishedAt`, `sources[]`, plus derived links: Watch Again (YouTube / in-app player) and Share Discovery (`https://dexty.live/e/<slug>`). A public card shows **no** nickname, player id, child identity or progress.

## Player data (local device, separate records)

| Key | Content |
|---|---|
| `dexty-collection-v1` | `{ saved: { [cardId]: { savedAt } } }` — base cards saved freely, no playback or quiz needed. |
| `dexty-learning-v1` | `{ [episodeId]: { readAt?, quiz?: { answered, correct, at } } }` — private learning feedback, never ranked. |
| `dykt-settings-v1` | Unchanged (`lang`, `audience`, `chosen`). |

### Migration from `dykt-progress-v1`
1. Every card in `cards.kids` / `cards.adults` becomes a saved card (`savedAt` = original `at`). Nothing earned is deleted.
2. Old `rarity`, `sparks`, `slot`, points move to `legacy` on the saved entry and are shown as "earned in the first season" badges — not as proof of knowledge.
3. `gates` (the retired magic word, found before 9 Oct 2026) becomes `learning[...].bonusWordAt`; kept read-only, nothing reads it any more.
4. The old key is kept read-only for one release, then removed after a documented release note.
5. The viewing-order rarity ladder and `daily-limit.js` ladder are retired; a migration test covers old → new for both audiences.

### Backup
Export = a downloaded JSON file `{ app: "dexty", version: 1, exportedAt, collection, learning, settings }`. Import validates shape, ids against the catalog, timestamps and size (< 256 KB) before replacing anything, and reports what was restored.
