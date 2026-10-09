#!/usr/bin/env bash
# Renders the two 8 s neon-card clips (with sound) into out/:
#   out/neon-card-kids-SUN.mp4   and   out/neon-card-adults-GOLDEN.mp4
# Audio comes from brand/audio/neon-{kids,adults}.wav (tools/make_audio.py).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
cd "$ROOT/neon-card"

render() {
  local audience="$1" word="$2" kicker="$3" footer="$4"
  local silent="$OUT/_neon-$audience-silent.mp4"
  local final="$OUT/neon-card-$audience-$word.mp4"
  echo "▶ Rendering $word ($audience)…"
  npx --yes hyperframes@0.8.143 render -q delivery -f 30 -o "$silent" \
    --variables "{\"word\":\"$word\",\"kicker\":\"$kicker\",\"footer\":\"$footer\",\"theme\":\"$audience\"}"
  ffmpeg -y -v error -i "$silent" -i "$ROOT/brand/audio/neon-$audience.wav" \
    -c:v copy -c:a aac -b:a 192k -shortest "$final"
  rm -f "$silent"
  echo "✔ $final"
  ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate:format=duration -of compact "$final"
}

render kids SUN "MAGIC WORD" "Bonus: type it in the game for a surprise ✦"
render adults GOLDEN "THE SPECIAL WORD" "Type it in the game to break the seal ✦"
echo "✅ Both neon cards rendered into $OUT"
