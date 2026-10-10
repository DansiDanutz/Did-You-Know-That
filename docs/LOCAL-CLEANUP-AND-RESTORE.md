# Did You Know That? (Dexty): keep the Mac light, restore from GitHub

Everything that matters about this project lives off this Mac. This file says where, what was
cleaned on 10 Oct 2026, what is still waiting for approval, and how to rebuild a working copy.
Written for the Mac Studio (JEV-MAC) cleanup policy: verify recovery first, delete only what can
be recreated, never delete a repository, log the result.

## 1. Where everything lives

| What | Where | Recreate how |
|---|---|---|
| All code, docs, episode data, tests, history | GitHub `DansiDanutz/Did-You-Know-That`, `main` plus every branch (all 15 local branches were identical to the live remote on 10 Oct 2026, no tags, no stashes) | `git clone` |
| The live game | https://dexty.live, Vercel project `did-you-know-that-2026` (deploy from `website/`) | `vercel deploy --prod` from `website/` |
| House of Family clips (371 mp3, 54.8 MB) | Public Vercel Blob store `dexty-voice`, `family/v1/<lang>/<id>.mp3`; manifest `website/assets/voice/family-voice-manifest.json` | re-record with `website/tools/make-family-voice.mjs`, upload with `website/tools/upload-family-voice.mjs` |
| Book narration (448 mp3, 154.6 MB) | Same store, `narration/v1/<lang>/<audience>/<story>/<voice>/<key>.mp3`; manifest `website/assets/narration/store-manifest.json` | `website/tools/make-narration.mjs` then `website/tools/upload-narration.mjs` |
| Paid-voice key (ElevenLabs) | `~/.openclaw/fleet.env` (never print it, never commit it) | n/a |
| Blob upload token | Vercel, environment variable `BLOB_READ_WRITE_TOKEN` (development) | `vercel env pull <path outside the repo> --environment development`, delete the file afterwards |

Not on GitHub on purpose (public repo): fonts (`*.ttf`), `.env*`, tokens, ElevenLabs key.
Not worth keeping: the rejected video renders (`out/ep01-*.mp4`), the audio beds, the FLUX image model.
Video and YouTube production for Dexty was stopped on 10 Oct 2026; the project is the game only.

## 2. What was cleaned on 10 Oct 2026 (done)

- 23 ignored, never-pushed files inside the checkout, 331 MB: six rejected video renders in `out/`,
  five video clips and three audio beds under `video/`, ten Avenir Next font copies
  (Avenir Next ships with macOS at `/System/Library/Fonts/Avenir Next.ttc`).
- `out/` and `video/` (78 MB, tracked on GitHub) removed from the working tree with a sparse checkout.
  They are still in git. Bring them back with `git sparse-checkout disable`.
- `git gc` packed the repository (the pack is still about 856 MB, see section 5).
- All 227 tests and the precache check pass after the cleanup.

## 3. Still waiting for approval (about 12 GB outside the repo)

The deletion of caches outside the repository was blocked by the safety classifier, so it is a
step for you. Dry run first, then apply, from your own Terminal:

```bash
cd ~/Projects/Did-You-Know-That
tools/clean-local.sh            # lists the items and sizes, deletes nothing
tools/clean-local.sh --apply    # deletes them
```

It removes only these, all created for this project, all re-creatable:

| Item | Size | Why it is safe |
|---|---|---|
| `~/.venvs/mflux` | 1.1 GB | image-generation venv; the painted-art pipeline was dropped |
| `~/.cache/huggingface/hub/models--mflux-community--flux-1-schnell-mflux-q4` and its 16 blobs | 9.2 GB | FLUX model; other models in that cache are kept; downloads again if ever needed |
| `$TMPDIR/hyperframes-extract-cache-501` | 1.1 GB | frame cache of the video renders |
| `~/.npm/_npx/<hash>` folders holding `hyperframes` (5) or `playwright-core` (1) | 0.6 GB | npx re-downloads on demand |
| `.voice-out/`, `.narration-out/` in the checkout | 0 MB now | recorder output that has already been uploaded |

The script refuses to run while mflux, hyperframes or a render is active, and prints free space
before and after. It never touches tracked files, git history, `~/.claude`, `~/.openclaw`,
`~/.paperclip`, the Trash, or caches shared with other projects (Playwright browsers, uv, Homebrew).

## 4. Rebuild a working copy from nothing

```bash
git clone https://github.com/DansiDanutz/Did-You-Know-That.git ~/Projects/Did-You-Know-That
cd ~/Projects/Did-You-Know-That
git sparse-checkout set --cone brand docs episodes intro neon-card outro tools website   # skips out/ and video/
cd website
node --test tests/*.test.mjs        # 227 tests, no install needed
node tools/build-pages.mjs --check  # the precache must be current
```

Run the game locally: `python3 -m http.server 4173` inside `website/` and open http://localhost:4173.
Audio is served from the Blob store, so it needs internet.

Deploy (only when asked): `cd website && vercel link` (project `did-you-know-that-2026`), then
`vercel deploy --prod --yes`. Main is merge-only: branch, pull request, the `website` check, merge, deploy.

Add or change narration:

1. `ELEVENLABS_API_KEY` from `~/.openclaw/fleet.env`. Run the tool with `--dry-run` first: it prints the
   characters, the plan and the remaining credits. Recording spends paid credits.
2. `node tools/make-family-voice.mjs --lang=de` (or `make-narration.mjs`) writes to `.voice-out/` or `.narration-out/`.
3. `vercel env pull` to a path outside the repo to get `BLOB_READ_WRITE_TOKEN`, then
   `node tools/upload-family-voice.mjs .voice-out` (or `upload-narration.mjs`).
4. Re-recorded text needs a new version: bump `FAMILY_VOICE_VERSION` or `NARRATION_VERSION`
   (clips are cached for a year), upload the new version, commit the manifest.
5. Delete the temporary folder and the token file.

Only if videos are ever restarted: `git sparse-checkout disable` brings back `out/` and `video/`;
extract the Demi Bold and Heavy faces of Avenir Next from the macOS font collection (never commit
them); `python3 tools/make_bed.py <project>` rebuilds the audio beds; HyperFrames is
`npx --yes hyperframes@0.8.143`.

## 5. Why `.git` is still about 866 MB

Old copies of the narration and the video files are part of the history, and audio and video do not
compress. Moving the files to the Blob store emptied the working tree but not the history. Two ways
to shrink it, both need explicit approval and a clean-room check first:

- Preferred, nothing is lost: re-clone as a partial clone, which downloads file contents only when needed.
  `git clone --filter=blob:none https://github.com/DansiDanutz/Did-You-Know-That.git <new path>`, check
  `git ls-remote origin` against the old checkout, then remove the old checkout with the approved cleanup
  operation. Result: a few tens of MB locally.
- Rewriting history (force-push to main) is not allowed on this machine.

## 6. Rules to keep the disk light

1. Before anything big (download, install, render, clone, archive):
   `/Users/davidai/.local/bin/danslab-workflow status --path <folder>`. Below the reserve (46 GiB here) do small
   work only. A hold is never bypassed and shared caches are never emptied to get past it.
2. Scratch work goes in a temporary folder and is deleted at the end. Nothing large stays in the checkout.
3. Never commit fonts, `.env*`, tokens or keys. Never print a secret. A token file written by a CLI
   (for example `vercel blob create-store` writes `.env.local`) is moved out of the repo at once and deleted after use.
4. Large media belongs in the Blob store or on Drive, with a manifest in git, not in git.
5. Deleting a repository, history or Trash is never automatic. `Done` does not mean `delete`.
6. After a cleanup, record it: a line in `~/README.md` (Cleanup log) and the project record in
   `~/.codex/project-catalog/`.

## 7. Verify a cleanup

```bash
cd ~/Projects/Did-You-Know-That
git status --short                         # empty
git ls-remote --heads origin               # every local branch tip is on GitHub
git sparse-checkout list                   # brand docs episodes intro neon-card outro tools website
du -sh . .git                              # what is left
df -h /                                    # free space
cd website && node --test tests/*.test.mjs
```
