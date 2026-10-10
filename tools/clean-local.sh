#!/usr/bin/env bash
# Frees disk space used by local, re-creatable files of the Did-You-Know-That project.
# Everything it can remove is on GitHub, in the Vercel Blob store, or can be regenerated
# (see docs/LOCAL-CLEANUP-AND-RESTORE.md). It never touches the repository's tracked files,
# git history, ~/.claude, ~/.openclaw, ~/.paperclip, Trash, or any cache shared with other projects.
#
#   tools/clean-local.sh            dry run: lists what would go and how big it is
#   tools/clean-local.sh --apply    deletes it
#
# Run it from a Terminal of your own. It refuses to run while a tool that uses these
# caches (mflux, hyperframes, a render) is active, and it checks free space before and after.
set -euo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HF_HUB="$HOME/.cache/huggingface/hub"
FLUX_MODEL="$HF_HUB/models--mflux-community--flux-1-schnell-mflux-q4"
TMPDIR_USER="$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo /tmp/)"

free_mb() { df -k / | tail -1 | awk '{printf "%d", $4/1024}'; }
size_mb() { [ -e "$1" ] && du -sk "$1" 2>/dev/null | awk '{printf "%d", $1/1024}' || echo 0; }

# Candidate folders and files: only things created for this project.
TARGETS=(
  "$HOME/.venvs/mflux"                                   # image-generation venv (the art pipeline was dropped)
  "$TMPDIR_USER/hyperframes-extract-cache-501"           # frame cache of the video renders
  "$REPO/.voice-out"                                     # recorder output, uploaded to the Blob store
  "$REPO/.narration-out"                                 # same, for the book narration
)
# npx caches that hold hyperframes or the playwright-core used for browser captures (re-downloaded on demand).
for dir in "$HOME"/.npm/_npx/*/; do
  [ -d "${dir}node_modules/hyperframes" ] || [ -d "${dir}node_modules/playwright-core" ] && TARGETS+=("${dir%/}") || true
done

if pgrep -fl "mflux|hyperframes|ffmpeg .*Did-You-Know-That" >/dev/null 2>&1; then
  echo "A tool that uses these caches is running. Stop it first, then run this again."; exit 1
fi

before="$(free_mb)"
total=0
echo "Free space now: ${before} MB"
echo
for path in "${TARGETS[@]}"; do
  [ -e "$path" ] || continue
  mb="$(size_mb "$path")"; total=$((total + mb))
  printf "  %6d MB  %s\n" "$mb" "$path"
done

# The FLUX model: remove the model folder and only the blobs that folder points to.
if [ -d "$FLUX_MODEL" ]; then
  blobs="$(find "$FLUX_MODEL/snapshots" -type l -exec readlink -f {} \; 2>/dev/null | sort -u)"
  blob_mb=0
  while IFS= read -r blob; do [ -f "$blob" ] && blob_mb=$((blob_mb + $(size_mb "$blob"))); done <<<"$blobs"
  total=$((total + blob_mb))
  printf "  %6d MB  %s (model blobs only; other models in the cache are kept)\n" "$blob_mb" "$FLUX_MODEL"
fi

# Ignored (never pushed) files in the checkout: renders, audio beds, font copies. Listed, not guessed.
ignored="$(git -C "$REPO" status --ignored --short | awk '/^!!/{print $2}' | grep -v -e '^website/.vercel/$' -e '^website/assets/narration/_samples/$' || true)"
ig_mb=0
while IFS= read -r rel; do [ -n "$rel" ] && [ -e "$REPO/$rel" ] && ig_mb=$((ig_mb + $(size_mb "$REPO/$rel"))); done <<<"$ignored"
total=$((total + ig_mb))
printf "  %6d MB  ignored files inside the checkout (kept: website/.vercel, narration _samples)\n" "$ig_mb"

echo
echo "Total that would be freed: about ${total} MB"
if [ "$APPLY" -ne 1 ]; then echo "Dry run only. Nothing was deleted. Add --apply to delete."; exit 0; fi

for path in "${TARGETS[@]}"; do [ -e "$path" ] && rm -rf -- "$path"; done
if [ -d "$FLUX_MODEL" ]; then
  while IFS= read -r blob; do
    case "$blob" in "$HF_HUB/blobs/"*) rm -f -- "$blob" ;; *) echo "skipped unexpected path $blob" ;; esac
  done <<<"$blobs"
  rm -rf -- "$FLUX_MODEL"
fi
while IFS= read -r rel; do [ -n "$rel" ] && [ -e "$REPO/$rel" ] && rm -rf -- "${REPO:?}/$rel"; done <<<"$ignored"

after="$(free_mb)"
echo "Free space: ${before} MB -> ${after} MB (freed $((after - before)) MB)"
