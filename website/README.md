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

Generated (do not hand-edit): `index.html`, `404.html`, `sitemap.xml`, `collection/`, `episodes/`, `subject/`.
Templates live in `tools/lib/` (`pages-home.mjs`, `pages-episode.mjs`, `pages-misc.mjs`, `layout.mjs`, `components.mjs`); channel facts in `tools/lib/site.mjs`.

## Deep links

- `/?q=sun` — search pre-filled (matches subject, keywords, title and hook text)
- `/subject/time/` — subject page; an unknown `/subject/<word>/` falls back to `/?q=<word>` (via `404.html`, on Vercel)
- `/episodes/<slug>/` — episode page
- `/collection/?card=<fact id>` — a shared fact card (image-free link)

## Game rules and guardrails

- Progress (guesses, reveals) lives only in `localStorage` key `dyk.progress.v1`; storage failures fall back to memory, and the site works without it. "Forget my progress" on `/collection/` clears it.
- No accounts, no analytics, no cookies, no timers, streaks or loss messages.
- Cards unlock after locking a guess and pressing "I watched it — reveal the answer" (an honour click, never measured watch time). Draft episodes cannot be revealed.
- Ranks: Curious (0) → Explorer (3) → Time Traveler (9) → Mystery Master (18) cards — `js/lib/progress.js`.

## Hosting

Static on Vercel (project root = `website/`, no build command — generated pages are committed).
`vercel.json` sets security headers (CSP allows only self, `i.ytimg.com` images and the `youtube-nocookie.com` frame),
caching, trailing slashes and redirects from the retired game URLs (`/e/*`, `/archive/*`, `/parents/*`).
`sw.js` is a retirement worker: it deletes the old game's caches and unregisters itself for returning visitors.
Fonts (Montserrat, Inter, Newsreader — SIL OFL, see `fonts/OFL.txt`) are self-hosted.
