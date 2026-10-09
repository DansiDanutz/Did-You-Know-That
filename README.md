# Did You Know That?

YouTube channel [@Did-You-Know-that-2026](https://www.youtube.com/@Did-You-Know-that-2026) and its companion game, **The Road of Wonders**: https://did-you-know-that-2026.vercel.app

| Folder | What it is |
|---|---|
| `website/` | The game (static HTML/JS + Vercel functions for the leaderboard). `npm test` runs the test suite. |
| `episodes/` | Episode scripts and the Series Bible (rules for every episode). |
| `intro/`, `outro/`, `neon-card/` | HyperFrames video compositions (channel intro, end screen, mid-video neon word card). |
| `tools/` | Sound generator (`make_audio.py`) and the neon-card render script. |
| `brand/` | Logo, banner and generated audio. |
| `out/` | Rendered videos and previews. |
| `NEXT-STEPS.md` | The project checklist (shown by the Next Step band). |

Production order for every episode: **story → voice → book → video**.

Fonts: the video compositions use Avenir Next, a licensed Apple font that is not included in this repository. Copy it locally into each project's `assets/` to render.
