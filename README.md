# Did You Know That?

A YouTube discovery series — [@Did-You-Know-that-2026](https://www.youtube.com/@Did-You-Know-that-2026) — and its channel website **dexty.live**: one subject per episode, traced from 1500 to today to 2100, with a light game layer (guess before you watch, collect “Did you know that…” cards).

| Folder | What it is |
|---|---|
| `website/` | The channel website (static, dependency-free, generated from `website/data/episodes.json`). Publish a video with `node tools/add-video.mjs <slug> <youtubeId>` — see `website/README.md`. `npm test` runs the unit tests; CI runs them on every push/PR. |
| `episodes/` | Series Bible, episode templates (`templates/`) and one folder/script per episode. |
| `video/` | HyperFrames episode projects (`ep01-kids/`). |
| `intro/`, `outro/`, `neon-card/` | Optional HyperFrames assets: channel intro, end screen, neon word card. |
| `tools/` | Procedural sound (`make_audio.py`, `make_ep01_kids_audio.py`), narration (`make_ep01_kids_vo.mjs`) and pinned render scripts. |
| `brand/` | Logo, banner and generated audio. |
| `out/` | Rendered videos and previews (masters are git-ignored). |
| `docs/` | Master-plan acceptance matrix, audit reconciliation, data contract, asset/rights inventory, open decisions. |
| `NEXT-STEPS.md` | The project checklist. |

Rules that never change: the site never rewards watch time (YouTube API policy) — cards unlock on a guess + reveal; publishing, production deployment and paid generation need David's approval.

Fonts: the video compositions currently use Avenir Next, an Apple system font that is not in this repository (copy it into each project's `assets/` to render). See `docs/ASSETS.md` — switching to an open-licence font is an open decision.
