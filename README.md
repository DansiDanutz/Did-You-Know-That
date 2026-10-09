# Did You Know That?

A YouTube discovery series — [@Did-You-Know-that-2026](https://www.youtube.com/@Did-You-Know-that-2026) — and its companion app **dexty.live**, guided by **Dexter**. Video first, collection second: discover an episode, watch it voluntarily, save its knowledge card, come back to it and share it. Kids and adults get separate experiences under one brand.

| Folder | What it is |
|---|---|
| `website/` | The companion app (static HTML/JS, installable PWA, Vercel functions). `npm test` runs the unit tests; CI runs them on every push/PR. |
| `episodes/` | Series Bible, episode templates (`templates/`) and one folder/script per episode. |
| `video/` | HyperFrames episode projects (`ep01-kids/`). |
| `intro/`, `outro/`, `neon-card/` | Optional HyperFrames assets: channel intro, end screen, neon word card. |
| `tools/` | Procedural sound (`make_audio.py`, `make_ep01_kids_audio.py`), narration (`make_ep01_kids_vo.mjs`) and pinned render scripts. |
| `brand/` | Logo, banner and generated audio. |
| `out/` | Rendered videos and previews (masters are git-ignored). |
| `docs/` | Master-plan acceptance matrix, audit reconciliation, data contract, asset/rights inventory, open decisions. |
| `NEXT-STEPS.md` | The project checklist. |

Rules that never change: the app never rewards watching (YouTube API policy); publishing, production deployment and paid generation need David's approval.

Fonts: the video compositions currently use Avenir Next, an Apple system font that is not in this repository (copy it into each project's `assets/` to render). See `docs/ASSETS.md` — switching to an open-licence font is an open decision.
