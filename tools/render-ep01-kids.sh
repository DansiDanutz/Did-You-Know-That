#!/usr/bin/env bash
# Full render of Episode 1 (Kids) "The Scroll Monster":
#   neon cards -> episode -> loudness to -14 LUFS -> QA frames.
# Run from the repo root:  bash tools/render-ep01-kids.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
FINAL="$OUT/ep01-kids-the-scroll-monster.mp4"

bash "$ROOT/tools/render-neon-cards.sh" | grep -E "Rendering|neon-card-|Both" || true
cp "$OUT/neon-card-kids-SUN.mp4" "$ROOT/video/ep01-kids/assets/neon-kids.mp4"
rm -f "$OUT/neon-card-kids-SPARK.mp4"

cd "$ROOT/video/ep01-kids"
npx --yes hyperframes render -q delivery -f 30 -o "$OUT/_ep01k-raw.mp4" 2>&1 | grep -E "Render complete|rror" || true

ffmpeg -y -v error -i "$OUT/_ep01k-raw.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 "$FINAL"
rm -f "$OUT/_ep01k-raw.mp4"

echo "Loudness:"
ffmpeg -hide_banner -i "$FINAL" -af ebur128=peak=true -vn -f null - 2>&1 | grep -E "^\s+(I|Peak):" | head -2
echo "Duration,size: $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$FINAL")"
ffmpeg -y -v error -i "$FINAL" \
  -vf "select='eq(n\,900)+eq(n\,3822)+eq(n\,4110)+eq(n\,4800)+eq(n\,6990)+eq(n\,7500)',scale=480:-1,tile=3x2" \
  -frames:v 1 "$OUT/_ep01k-check.jpg"
echo "ALL-DONE"
