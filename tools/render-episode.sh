#!/usr/bin/env bash
# Full render of one episode composition:
#   render -> loudness to -14 LUFS -> duration check -> master replaced only on success.
# Any failed step stops the script; the renderer is pinned to the project's version.
# Run from the repo root:
#   bash tools/render-episode.sh video/ep01-kids   out/ep01-kids-who-keeps-pressing-play.mp4
#   bash tools/render-episode.sh video/ep01-adults out/ep01-adults-the-re-reading-trap.mp4
set -euo pipefail

PROJECT="${1:?project dir, e.g. video/ep01-kids}"
FINAL="${2:?output file, e.g. out/ep01-kids.mp4}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HYPERFRAMES="npx --yes hyperframes@0.8.143"
MAX_SECONDS=300
RUN="$ROOT/out/_render-$$"
RAW="$RUN-raw.mp4"
NEXT="$RUN-final.mp4"
LOG="$RUN.log"
mkdir -p "$ROOT/out"
trap 'rm -f "$RAW" "$NEXT"' EXIT

cd "$ROOT/$PROJECT"
$HYPERFRAMES check > "$LOG" 2>&1 || { tail -30 "$LOG"; echo "Check FAILED"; exit 1; }
$HYPERFRAMES render -q delivery -f 30 -o "$RAW" > "$LOG" 2>&1 || { tail -30 "$LOG"; echo "Render FAILED"; exit 1; }
grep -E "Render complete" "$LOG"
[ -s "$RAW" ] || { echo "Render produced no file"; exit 1; }

ffmpeg -y -v error -i "$RAW" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false" -c:a aac -b:a 192k -ar 48000 "$NEXT"

DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NEXT")"
if ! awk -v d="$DURATION" -v m="$MAX_SECONDS" 'BEGIN { exit !(d > 0 && d <= m) }'; then
  echo "Duration $DURATION s is outside 0-$MAX_SECONDS s: master NOT replaced"; exit 1
fi
mv "$NEXT" "$ROOT/$FINAL"
rm -f "$LOG"

echo "Loudness:"
ffmpeg -hide_banner -i "$ROOT/$FINAL" -af ebur128=peak=true -vn -f null - 2>&1 | grep -E "^\s+(I|Peak):" | head -2
echo "Duration,size: $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$ROOT/$FINAL")"
