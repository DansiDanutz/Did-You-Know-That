# dexty.live — the "Did You Know That?" channel website

A static, dependency-free site for the YouTube series [Did You Know That?](https://www.youtube.com/channel/UC7j29XhArv5tlRqQj2qAb4Q)
(@Did-You-Know-that-2026), with a light game layer: guess before you watch, collect "Did you know that…" cards, climb an explorer rank.

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
    "quiz": { "question": "…", "options": ["…", "…", "…"], "answerIndex": 1, "reveal": "…" },
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
embed, VideoObject JSON-LD, and its quiz reveal + fact cards become collectible. No YouTube API, no keys.

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
Signing in attaches this browser's progress (`owner` in `dyk.progress.v1`) and the sheet shows rank, cards and guesses.
No server accounts, no email, no password, no push notifications (the sheet links to the newsletter instead).
Templates live in `tools/lib/` (`pages-home.mjs`, `pages-episode.mjs`, `pages-misc.mjs`, `layout.mjs`, `components.mjs`, `newsletter.mjs`, `pwa.mjs`); channel facts in `tools/lib/site.mjs`.

## Deep links

- `/?q=sun` — search pre-filled (matches subject, keywords, title and hook text)
- `/subject/time/` — subject page; an unknown `/subject/<word>/` falls back to `/?q=<word>` (via `404.html`, on Vercel)
- `/episodes/<slug>/` — episode page
- `/collection/?card=<fact id>` — a shared fact card (image-free link)

## Game rules and guardrails

- Progress (guesses, reveals) lives only in `localStorage` key `dyk.progress.v1`; storage failures fall back to memory, and the site works without it. "Forget my progress" on `/collection/` clears it.
- No server accounts (sign-in is a local profile, see above), no analytics, no cookies, no timers, streaks or loss messages.
- Cards unlock after locking a guess and pressing "I watched it — reveal the answer" (an honour click, never measured watch time). Draft episodes cannot be revealed.
- Ranks: Curious (0) → Explorer (3) → Time Traveler (9) → Mystery Master (18) cards — `js/lib/progress.js`.

## Hosting

Static on Vercel (project root = `website/`, no build command — generated pages are committed).
`vercel.json` sets security headers (CSP allows only self, `i.ytimg.com` images, the `youtube-nocookie.com` frame and — once configured — the newsletter provider as a form target),
caching, trailing slashes and redirects from the retired game URLs (`/e/*`, `/archive/*`, `/parents/*`).
`sw.js` is the app's service worker (see "Installable app"); it also clears the retired game's caches.
Fonts (Montserrat, Inter, Newsreader — SIL OFL, see `fonts/OFL.txt`) are self-hosted.
