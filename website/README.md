# dexty.live — the "Did You Know That?" channel website

A static, dependency-free site for the YouTube series [Did You Know That?](https://www.youtube.com/channel/UC7j29XhArv5tlRqQj2qAb4Q)
(@Did-You-Know-that-2026), with a light game layer: guess before you watch, answer the episode quiz, collect "Did you know that…" cards, earn knowledge points and climb an explorer rank.

## Everything comes from one file

`data/episodes.json` drives the home page (subject map, series grid, comment links), every episode page,
every subject page, the collection page, `sitemap.xml` and the client-side search.

```jsonc
{
  "episodes": [{
    "number": 1, "slug": "time-compressed", "title": "Time, Compressed",
    "subject": "Time", "subjectSlug": "time",          // headline word → /subject/time/
    "keywords": ["time", "clock", "sleep", "weekend"],  // words that find it in search
    "hook": "…", "question": "…", "guess": "…", "summary": "…", "commentPrompt": "…",
    "status": "draft",                                  // draft | published
    "youtubeId": null, "publishedAt": null,              // set by tools/add-video.mjs
    "thumbnail": "/assets/episodes/time-compressed/thumb.png",   // our artwork (or null)
    "quiz": {                                           // "guess before you watch" + the per-era quiz
      "question": "…", "options": ["…", "…", "…"], "answerIndex": 1, "reveal": "…",
      "questions": [{                                   // optional; no questions = "quiz coming soon"
        "id": "q1500", "era": "1500", "question": "…",
        "options": ["…", "…", "…", "…"], "answerIndex": 0,   // 3–4 unique options, exactly one right
        "reveal": "…",                                  // shown with the card after a right answer
        "card": "time-1500",                            // the fact card this answer unlocks
        "source": "F18"                                 // fact number in the episode's RESEARCH.md
      }]
    },
    "eras": [{ "year": "1500", "place": "A village", "line": "…", "prediction": false }],
    "facts": [{ "id": "time-1500", "year": "1500", "fact": "…", "source": "…" }]  // collectible cards
  }],
  "requested": [                                         // future subjects on the map (locked)
    { "subject": "Money", "slug": "money", "status": "idea", "keywords": ["money"], "pitch": "…" }
  ]
}
```

`requested[].status` is `idea` (our suggestion, shown "Locked · vote in the comments") or `requested`
(viewers really asked for it, shown "Requested · vote in the comments"). Only use `requested` for real requests.

The build validates `quiz.questions`: unique ids, 3–4 unique options, `answerIndex` on one of them, a `reveal`,
a `source` like `F18`, and a `card` that is one of the episode's `facts`. Every fact card must be unlocked by exactly
one question (so the "all cards" bonus is reachable). Every question must trace to a verified fact in the
episode's `RESEARCH.md`; 2100 predictions are never quiz facts.

## Publish a video (the only routine task)

When an episode is live on YouTube:

```bash
cd website
node tools/add-video.mjs time-compressed <youtubeId>          # or paste the full YouTube URL
node tools/add-video.mjs the-sun https://youtu.be/XXXXXXXXXXX --date 2026-11-01
git diff                                                       # review, then commit + open a PR
```

It sets `status: "published"`, `youtubeId` and `publishedAt` (today unless `--date`). A self-hosted
`thumbnail` is kept; only an episode without artwork gets `https://i.ytimg.com/vi/<id>/maxresdefault.jpg`
(hqdefault fallback in the page — note that image then loads from Google's servers). An already published
episode is refused unless you pass `--force`. It validates the catalog, then rebuilds all pages. The episode lights up on the map, gets a click-to-play
embed and VideoObject JSON-LD. No YouTube API, no keys.

Without a terminal: GitHub → Actions → **add video** → Run workflow (slug + id). It opens a pull request; merging it is the go-live step.
(Requires "Allow GitHub Actions to create and approve pull requests" in the repo settings. PRs opened by the
workflow token do not trigger the `tests` workflow; the add-video job runs the tests itself.)

To add a new episode: add an entry to `episodes` (status `draft`), run `npm run build:site`, commit.

Episode artwork (recommended — keeps visitors' IPs away from YouTube until they press play): put a 1280×720
`thumb.png` (or `.jpg`) plus `thumb.webp` (1280 wide) and `thumb-640.webp` in `assets/episodes/<slug>/`
(`cwebp -q 82 in.png -o thumb.webp`, `cwebp -q 80 -resize 640 0 in.png -o thumb-640.webp`) and set
`"thumbnail": "/assets/episodes/<slug>/thumb.png"`. The build fails if any of the three files is missing.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Serve locally at http://localhost:4173 (`python3 -m http.server`) |
| `npm run build:site` | Regenerate every page from `data/episodes.json` |
| `npm run check:site` | Fail if generated pages are out of date (CI runs this) |
| `npm test` | Unit tests with coverage (node:test, no dependencies) |
| `npm run add-video -- <slug> <id>` | Publish a video (see above) |

Generated (do not hand-edit): `index.html`, `404.html`, `sitemap.xml`, `offline/`, `collection/`, `episodes/`, `subject/`,
plus two stamped blocks: the CSP `form-action` in `vercel.json` (from `data/site.json`) and the `// BUILD:START … BUILD:END`
block in `sw.js` (precache list + a version hashed from those files). `--check` fails if any of them is stale.

## Home page layout

Banner hero (the real channel banner: `assets/brand/hero-*.webp|jpg`, a wide crop for ≥640px and a tighter phone crop,
both preloaded by media query) → **featured episode** (the newest published one with a click-to-play facade; before
anything is published, the next to premiere — the lowest-numbered draft — as "Premieres soon" with a "Guess before it
premieres" link to `/episodes/<slug>/#guess`) → newsletter signup → the rail of all episodes → subject search, map and
"Surprise me" → the rule → about. "Surprise me" picks only from episodes that are `published` with a `youtubeId`;
until one is, it says the first episode premieres soon.

## Newsletter

One entry in `data/site.json` drives the signup form under the featured episode and in every page's footer:

```json
{ "newsletter": { "provider": null, "action": null } }
```

- `provider: null` (shipped): the form renders **disabled** ("Newsletter launching soon"), has no `action` and no
  field names, and nothing is collected or stored anywhere. The privacy notice says so.
- Configured: the browser posts the form straight to the provider's hosted endpoint in a new tab (plain HTML form,
  no API keys, no proxy, no script). The provider sends the confirmation email (double opt-in) and handles unsubscribes.

| provider | `action` (copy it from the provider's "embed form" HTML) | email field |
|---|---|---|
| `"buttondown"` | `https://buttondown.com/api/emails/embed-subscribe/<username>` | `email` (+ hidden `embed=1`) |
| `"kit"` | `https://app.kit.com/forms/<form id>/subscriptions` (`app.convertkit.com` also accepted) | `email_address` |
| `"beehiiv"` | the `https://….beehiiv.com/…` URL of a beehiiv form that accepts a plain HTML POST | `email` |

Optional keys: `emailField` (override the field name), `hiddenFields` (`{ "name": "value" }`, e.g. a Kit tag or a
Buttondown `tag`), `privacyUrl` (defaults to the provider's privacy policy). The build validates the URL's host against
the provider, then **rewrites the CSP `form-action` in `vercel.json`** to `'self'` plus that origin — never edit that line
by hand; run `npm run build:site` and commit `vercel.json` with the rest. Turn on double opt-in in the provider's
settings (Buttondown: on by default; Kit: the form's "incentive email"; beehiiv: publication settings → double opt-in).
beehiiv's documented embed is an iframe/script; check that your beehiiv form accepts a plain POST before using it
(Buttondown or Kit are the safe choices). If the provider redirects after signup to another domain, add that origin too.

## Installable app (PWA)

`manifest.webmanifest` (name, short name "Dexty", standalone, navy theme, `any` + `maskable` icons 192/512) and
`sw.js`: the app shell is precached under a versioned cache; HTML is network-first (a new episode appears at once,
cached copy or `/offline/` without a connection); `data/episodes.json` and artwork are stale-while-revalidate;
third-party requests (YouTube, i.ytimg.com, the newsletter provider) are never intercepted or cached. On activate it
deletes every cache that is not its own — including the retired game's — and reloads tabs the old game was serving.
An "Install the app" bar appears after scrolling past the first screen where the browser supports installing
(Android/desktop: one tap; iPhone/iPad: the Add to Home Screen steps); dismissing it is remembered
(`dyk.install.dismissed.v1`).

## Local sign-in

"Sign in" in the header opens a sheet restored from the old game: who is playing (Kids 6–12 / Teens & Adults), then
a kid explorer name picked by the site ("Brave Fox 42" — kids never type a name) or a first name/nickname
(letters only, ≤ 20, rude words refused). The profile — a random `crypto.randomUUID()` id, audience and name — lives
only in `localStorage` key `dyk.profile.v1` (the old game's `dykt-profile-v1`/`dykt-settings-v1` are picked up).
Signing in attaches this browser's progress (`owner` in `dyk.progress.v2`); the header button shows the name and points wallet, and the sheet shows points, rank, cards and guesses.
No server accounts, no email, no password, no push notifications (the sheet links to the newsletter instead).
Templates live in `tools/lib/` (`pages-home.mjs`, `pages-episode.mjs`, `pages-misc.mjs`, `layout.mjs`, `components.mjs`, `newsletter.mjs`, `pwa.mjs`); channel facts in `tools/lib/site.mjs`.

## Deep links

- `/?q=sun` — search pre-filled (matches subject, keywords, title and hook text)
- `/subject/time/` — subject page; an unknown `/subject/<word>/` falls back to `/?q=<word>` (via `404.html`, on Vercel)
- `/episodes/<slug>/` — episode page
- `/collection/?card=<fact id>` — a shared fact card (image-free link)

## Game rules and guardrails

**Policy: never reward watching.** No points, cards or progress for "I watched it", for pressing play, watch time,
comments, likes or subscribes (YouTube fake-engagement policy). Points come only from answers. `tests/policy.test.mjs`
fails if any code outside the quiz's answer handler can award, or if a watch/view award type appears.

- Flow on an episode page: lock a guess → "Start the quiz" → one question per era, options shuffled → right answer
  shows the reveal and unlocks that era's fact card → summary (right first time, points earned, cards, "perfect" badge).
  The guess is final once locked and cannot be placed after the first quiz answer. A plain "Watch the episode" link stays.
- Points ledger (`js/lib/ledger.js`, pure): append-only events `{ id, type, pts, at }`, idempotent by `id`, so
  refreshing or replaying never double-counts. Points are fixed by type; stored events are re-validated on load.

  | Event id | Points | When |
  |---|---|---|
  | `quiz:<slug>:<questionId>` | 10 | the first attempt at that question is right (a wrong first attempt can still be solved for 0 points and still unlocks the card) |
  | `guess:<slug>` | 25 | quiz complete and the locked guess matches `quiz.answerIndex` |
  | `perfect:<slug>` | 50 | every question right first time |
  | `cards:<slug>` | 20 | every fact card of the episode unlocked through the quiz |
  | `daily:<YYYY-MM-DD>` | 5 | reserved for the phase 3 daily question (no UI yet) |
  | `spend:card:<id>` | −cost | reserved for the phase 2 Card Vault |

  Episode 01 is worth up to 175 points (8 × 10 + 25 + 50 + 20). Balance = awards − spends. Points never expire and cannot be bought.
- Ranks by points: Curious (0) → Explorer (30) → Time Traveler (80) → Mystery Master (150) — `js/lib/progress.js`.
- Progress lives only in `localStorage` key `dyk.progress.v2` (`guesses`, `answers`, `ledger`, `owner`). The v1 key is
  migrated once: guesses kept, cards opened with the removed "I watched it" button stay visible for published episodes
  (`legacyRevealed`) but earn no points and never count toward a bonus. If storage is blocked, progress lasts for the
  visit and the quiz shows a notice. "Forget my progress" on `/collection/` clears it.
- No server accounts (sign-in is a local profile, see above), no analytics, no cookies, no timers, streaks or loss messages.

## Hosting

Static on Vercel (project root = `website/`, no build command — generated pages are committed).
`vercel.json` sets security headers (CSP allows only self, `i.ytimg.com` images, the `youtube-nocookie.com` frame and — once configured — the newsletter provider as a form target),
caching, trailing slashes and redirects from the retired game URLs (`/e/*`, `/archive/*`, `/parents/*`).
`sw.js` is the app's service worker (see "Installable app"); it also clears the retired game's caches.
Fonts (Montserrat, Inter, Newsreader — SIL OFL, see `fonts/OFL.txt`) are self-hosted.
