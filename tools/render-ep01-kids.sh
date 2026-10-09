#!/usr/bin/env bash
# Full render of Episode 1 (Kids) "The Scroll Monster":
#   neon cards -> episode -> loudness to -14 LUFS -> checks -> QA frames.
# Any failed step stops the script; the master is only replaced after the
# new render passed its checks (renderer pinned to the project's version).
# Run from the repo root:  bash tools/render-ep01-kids.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
FINAL="$OUT/ep01-kids-the-scroll-monster.mp4"
HYPERFRAMES="npx --yes hyperframes@0.8.143"
MAX_SECONDS=300
RUN="$OUT/_ep01k-$$"
RAW="$RUN-raw.mp4"
NEXT="$RUN-final.mp4"
LOG="$RUN.log"
trap 'rm -f "$RAW" "$NEXT"' EXIT

bash "$ROOT/tools/render-neon-cards.sh" > "$LOG" 2>&1 || { tail -30 "$LOG"; echo "Neon cards FAILED"; exit 1; }
grep -E "^✔|Both" "$LOG"
cp "$OUT/neon-card-kids-SUN.mp4" "$ROOT/video/ep01-kids/assets/neon-kids.mp4"

cd "$ROOT/video/ep01-kids"
$HYPERFRAMES render -q delivery -f 30 -o "$RAW" > "$LOG" 2>&1 || { tail -30 "$LOG"; echo "Render FAILED"; exit 1; }
grep -E "Render complete" "$LOG"
[ -s "$RAW" ] || { echo "Render produced no file"; exit 1; }

ffmpeg -y -v error -i "$RAW" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false" -c:a aac -b:a 192k -ar 48000 "$NEXT"

DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NEXT")"
if ! awk -v d="$DURATION" -v m="$MAX_SECONDS" 'BEGIN { exit !(d > 0 && d <= m) }'; then
  echo "Duration $DURATION s is outside 0-$MAX_SECONDS s: master NOT replaced"; exit 1
fi
mv "$NEXT" "$FINAL"
rm -f "$LOG"

echo "Loudness:"
ffmpeg -hide_banner -i "$FINAL" -af ebur128=peak=true -vn -f null - 2>&1 | grep -E "^\s+(I|Peak):" | head -2
echo "Duration,size: $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$FINAL")"
ffmpeg -y -v error -i "$FINAL" \
  -vf "select='eq(n\,900)+eq(n\,3960)+eq(n\,4250)+eq(n\,4950)+eq(n\,7300)+eq(n\,8100)',scale=480:-1,tile=3x2" \
  -frames:v 1 "$OUT/_ep01k-check.jpg"
echo "ALL-DONE"
